let navItems = document.querySelectorAll(".nav-item")
let pageTitle = document.getElementById("pageTitle")
let pageDescription = document.getElementById("pageDescription")
let pageContent = document.getElementById("pageContent")

function initializeStudentSearch() {
  let searchInput =
    document.getElementById("studentGeneralSearch")

  searchInput.addEventListener("input", function() {
    let searchTerm =
      this.value.toLowerCase().trim()

    let studentRows =
      document.querySelectorAll(
        "#studentsTableBody tr"
      )

    for (let row of studentRows) {
      let rowText =
        row.textContent.toLowerCase()

      if (rowText.includes(searchTerm)) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    }

    let enrollmentRows =
      document.querySelectorAll(
        "#enrollmentsTableBody tr"
      )

    for (let row of enrollmentRows) {
      let rowText =
        row.textContent.toLowerCase()

      if (rowText.includes(searchTerm)) {
        row.style.display = ""
      } else {
        row.style.display = "none"
      }
    }
  })
  
}

function loadPage(file) {
  return fetch(file)
    .then(response => {
      if (!response.ok) {
        throw new Error("Could not load " + file)
      }

      return response.text()
    })
    .then(html => {
      pageContent.innerHTML = html

      if (file === "settings.html") {
        let schoolYear =
          document.getElementById(
            "activeSchoolYear"
          )

        if (schoolYear) {
          schoolYear.value =
            localStorage.getItem(
              "activeSchoolYear"
            ) || schoolYear.value
        }
      }
    })
    .catch(error => {
      console.error(error)

      pageContent.innerHTML = `
        <div class="module-card">
          <h2>Unable to Load Page</h2>
          <p>${error.message}</p>
        </div>
      `
    })
}

// =========================================================
// EVENT TRANSACTIONS — LOAD EVENTS
// =========================================================

function loadTransactionEvents() {

  let eventSelect =
    document.getElementById(
      "transactionEvent"
    )

  if (!eventSelect) {
    return
  }


  fetch("/api/events")
    .then(response => {

      if (!response.ok) {

        throw new Error(
          "Failed to load events."
        )

      }

      return response.json()

    })
    .then(data => {

      let events =
        Array.isArray(data)
          ? data
          : data.events || []


      eventSelect.innerHTML = `
        <option value="">
          General Fund Transaction
        </option>
      `


      for (
        let event of events
      ) {

        let option =
          document.createElement(
            "option"
          )

        option.value =
          event.id

        option.textContent =
          `${event.event_name} — ${event.status}`

        eventSelect.appendChild(
          option
        )

      }

    })
    .catch(error => {

      console.error(
        "Failed to load transaction events:",
        error
      )

    })
}


// =========================================================
// EVENT TRANSACTIONS — DEFAULT DATE
// =========================================================

function setTransactionDate() {

  let dateInput =
    document.getElementById(
      "transactionDate"
    )

  if (!dateInput) {
    return
  }


  let today =
    new Date()


  let year =
    today.getFullYear()

  let month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    )

  let day =
    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    )


  dateInput.value =
    `${year}-${month}-${day}`
}


// =========================================================
// TRANSACTION — UPDATE SPENDING LIMIT
// =========================================================

// =========================================================
// TRANSACTION — UPDATE SPENDING LIMIT
// =========================================================

function updateTransactionSpendingLimit() {

  let transactionType =
    document.getElementById(
      "transactionType"
    )

  let transactionEvent =
    document.getElementById(
      "transactionEvent"
    )

  let limitContainer =
    document.getElementById(
      "transactionSpendingLimit"
    )

  let availableAmount =
    document.getElementById(
      "transactionAvailableAmount"
    )

  let amountInput =
    document.getElementById(
      "transactionAmount"
    )

  if (
    !transactionType ||
    !transactionEvent ||
    !limitContainer ||
    !availableAmount
  ) {
    return
  }

  // =======================================================
  // INCOME DOES NOT HAVE A SPENDING LIMIT
  // =======================================================

  if (
    transactionType.value !==
    "Expense"
  ) {

    limitContainer.style.display =
      "none"

    availableAmount.textContent =
      "₱0.00"

    if (amountInput) {
      amountInput.removeAttribute(
        "max"
      )
    }

    return
  }

  // =======================================================
  // EXPENSE
  // =======================================================

  let eventId =
    transactionEvent.value

  let endpoint =
    eventId
      ? `/api/event-transactions/spending-limit?eventId=${encodeURIComponent(eventId)}`
      : "/api/event-transactions/spending-limit"

  fetch(endpoint)
    .then(response => {

      return response.text()
        .then(text => {

          let data

          try {
            data =
              JSON.parse(text)
          } catch (error) {
            throw new Error(
              text ||
              "Invalid spending limit response."
            )
          }

          if (!response.ok) {
            throw new Error(
              data.error ||
              "Failed to load spending limit."
            )
          }

          return data

        })

    })
    .then(data => {

      // Make sure the user is STILL recording an Expense.
      let currentType =
        document.getElementById(
          "transactionType"
        )?.value

      if (
        currentType !==
        "Expense"
      ) {
        return
      }

      let amount =
        Number(
          data.availableAmount || 0
        )

      availableAmount.textContent =
        `₱${amount.toLocaleString(
          "en-PH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )}`

      limitContainer.style.display =
        "block"

      if (amountInput) {

        amountInput.max =
          amount

      }

    })
    .catch(error => {

      console.error(
        "Failed to load spending limit:",
        error
      )

      availableAmount.textContent =
        "Unable to calculate"

      limitContainer.style.display =
        "block"

      if (amountInput) {
        amountInput.removeAttribute(
          "max"
        )
      }

    })
}

// =========================================================
// EVENT TRANSACTIONS — SAVE
// =========================================================

function saveEventTransaction() {

  console.log(
    "SAVE TRANSACTION FUNCTION STARTED"
  )

  let transactionType =
    document.getElementById(
      "transactionType"
    ).value

  let eventId =
    document.getElementById(
      "transactionEvent"
    ).value

  let description =
    document.getElementById(
      "transactionDescription"
    ).value.trim()

  let amount =
    Number(
      document.getElementById(
        "transactionAmount"
      ).value
    )

  let transactionDate =
    document.getElementById(
      "transactionDate"
    ).value

  let modeOfPayment =
    document.getElementById(
      "transactionMode"
    ).value

  let referenceNumber =
    document.getElementById(
      "transactionReference"
    ).value.trim()

  if (!transactionType) {

    alert(
      "Please select a transaction type."
    )

    return

  }

  if (!description) {

    alert(
      "Please enter a description."
    )

    return

  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "Please enter a valid amount."
    )

    return

  }

  if (
    transactionType ===
    "Expense"
  ) {

    let availableText =
      document.getElementById(
        "transactionAvailableAmount"
      )?.textContent || ""

    let availableAmount =
      Number(
        availableText
          .replace(/[₱,]/g, "")
      )

    if (
      !Number.isFinite(
        availableAmount
      )
    ) {

      alert(
        "Unable to determine the available amount."
      )

      return

    }

    if (
      amount >
      availableAmount
    ) {

      alert(
        `You can only spend up to ₱${availableAmount.toLocaleString(
          "en-PH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )}.`
      )

      return

    }

  }

  if (!transactionDate) {

    alert(
      "Please select a transaction date."
    )

    return

  }

  let payload = {

    eventId:
      eventId
        ? Number(eventId)
        : null,

    transactionType:
      transactionType,

    description:
      description,

    amount:
      amount,

    transactionDate:
      transactionDate,

    modeOfPayment:
      modeOfPayment,

    referenceNumber:
      referenceNumber

  }

  console.log(
    "SENDING TRANSACTION:",
    payload
  )

  fetch(
    "/api/event-transactions",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify(
          payload
        )
    }
  )
    .then(response => {

      return response.text()
        .then(text => {

          let data

          try {

            data =
              JSON.parse(
                text
              )

          } catch (error) {

            throw new Error(
              text ||
              `Server returned HTTP ${response.status}`
            )

          }

          if (!response.ok) {

            throw new Error(
              data.error ||
              "Failed to save transaction."
            )

          }

          return data

        })

    })
    .then(() => {

      let form =
        document.getElementById(
          "transactionForm"
        )

      let modal =
        document.getElementById(
          "transactionModal"
        )

      if (form) {

        form.reset()

      }

      if (modal) {

        modal.classList.remove(
          "show"
        )

      }

      setTransactionDate()

      loadEvents()

      loadTodayTransactions()

      updateTransactionSpendingLimit()

      alert(
        "Transaction recorded successfully."
      )

    })
    .catch(error => {

      console.error(
        "Save event transaction error:",
        error
      )

      alert(
        error.message ||
        "Failed to save transaction."
      )

    })

}

// =========================================================
// TODAY'S TRANSACTION OVERVIEW
// =========================================================

// =========================================================
// EVENT TRANSACTIONS — DELETE
// =========================================================

function deleteEventTransaction(
  transactionId
) {

  if (
    !confirm(
      "Are you sure you want to delete this transaction?"
    )
  ) {
    return
  }

  fetch(
    `/api/event-transactions/${transactionId}`,
    {
      method: "DELETE"
    }
  )
    .then(response => {

      return response.text()
        .then(text => {

          let data

          try {
            data =
              JSON.parse(text)
          } catch (error) {
            throw new Error(
              text ||
              `Server returned HTTP ${response.status}`
            )
          }

          if (!response.ok) {
            throw new Error(
              data.error ||
              "Failed to delete transaction."
            )
          }

          return data

        })

    })
    .then(() => {

      loadTodayTransactions()

      loadEvents()

    })
    .catch(error => {

      console.error(
        "Delete transaction error:",
        error
      )

      alert(
        error.message ||
        "Failed to delete transaction."
      )

    })
}

// =========================================================
// TODAY'S TRANSACTION OVERVIEW
// =========================================================

function loadTodayTransactions() {

  let tableBody =
    document.getElementById(
      "todayTransactionsTableBody"
    )

  if (!tableBody) {
    return
  }

  fetch("/api/event-transactions")
    .then(response => {

      return response.text()
        .then(text => {

          if (!response.ok) {
            throw new Error(
              text ||
              `Transactions API returned ${response.status}`
            )
          }

          try {
            return JSON.parse(text)
          } catch (error) {
            throw new Error(
              text ||
              "Transaction API returned invalid data."
            )
          }

        })

    })
    .then(transactions => {

      if (!Array.isArray(transactions)) {
        throw new Error(
          "Transaction API did not return a transaction list."
        )
      }

      // =====================================================
      // OVERALL TRANSACTION TOTALS
      // =====================================================

      let income =
        transactions
          .filter(
            transaction =>
              transaction.transaction_type ===
              "Income"
          )
          .reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount
              ),
            0
          )

      let expenses =
        transactions
          .filter(
            transaction =>
              transaction.transaction_type ===
              "Expense"
          )
          .reduce(
            (total, transaction) =>
              total +
              Number(
                transaction.amount
              ),
            0
          )

      let netMovement =
        income -
        expenses

      // =====================================================
      // UPDATE OVERALL CARDS
      // =====================================================

      let todayIncome =
        document.getElementById(
          "todayIncome"
        )

      let todayExpenses =
        document.getElementById(
          "todayExpenses"
        )

      let todayNetMovement =
        document.getElementById(
          "todayNetMovement"
        )

      if (todayIncome) {

        todayIncome.textContent =
          `₱${income.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }

      if (todayExpenses) {

        todayExpenses.textContent =
          `₱${expenses.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }

      if (todayNetMovement) {

        todayNetMovement.textContent =
          `₱${netMovement.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }

      // =====================================================
      // FILTER ONLY TODAY'S TRANSACTIONS FOR THE TABLE
      // =====================================================

      let today =
        new Date()

      let year =
        today.getFullYear()

      let month =
        String(
          today.getMonth() + 1
        ).padStart(
          2,
          "0"
        )

      let day =
        String(
          today.getDate()
        ).padStart(
          2,
          "0"
        )

      let todayString =
        `${year}-${month}-${day}`

      let todaysTransactions =
        transactions.filter(
          transaction => {

            let transactionDate =
              String(
                transaction.transaction_date || ""
              )
                .trim()
                .substring(
                  0,
                  10
                )

            return (
              transactionDate ===
              todayString
            )

          }
        )

      // =====================================================
      // TODAY'S TRANSACTION HISTORY
      // =====================================================

      tableBody.innerHTML = ""

      if (
        todaysTransactions.length === 0
      ) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="7">
              No transactions recorded today.
            </td>
          </tr>
        `

        return

      }

      for (
        let transaction of
        todaysTransactions
      ) {

        let row =
          document.createElement(
            "tr"
          )

        let type =
          document.createElement(
            "td"
          )

        type.textContent =
          transaction.transaction_type

        let description =
          document.createElement(
            "td"
          )

        description.textContent =
          transaction.description

        let event =
          document.createElement(
            "td"
          )

        event.textContent =
          transaction.event_name ||
          "General Fund"

        let amount =
          document.createElement(
            "td"
          )

        amount.textContent =
          `₱${Number(
            transaction.amount
          ).toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

        let mode =
          document.createElement(
            "td"
          )

        mode.textContent =
          transaction.mode_of_payment ||
          "—"

        let reference =
          document.createElement(
            "td"
          )

        reference.textContent =
          transaction.reference_number ||
          "—"

        let action =
          document.createElement(
            "td"
          )

        action.innerHTML = `
          <button
            type="button"
            class="secondary-button"
            data-delete-transaction-id="${transaction.id}"
          >
            Delete
          </button>
        `

        row.appendChild(type)
        row.appendChild(description)
        row.appendChild(event)
        row.appendChild(amount)
        row.appendChild(mode)
        row.appendChild(reference)
        row.appendChild(action)

        tableBody.appendChild(row)

      }

    })
    .catch(error => {

      console.error(
        "Failed to load transaction overview:",
        error
      )

      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Failed to load today's transactions.
          </td>
        </tr>
      `

    })
}

// =========================================================
// EVENTS — LOAD EVENTS
// =========================================================

function loadEvents() {

  let tableBody =
    document.getElementById(
      "eventsTableBody"
    )

  if (!tableBody) {
    return
  }

  Promise.all([

    fetch("/api/events")
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Events API returned ${response.status}`
          )
        }

        return response.json()

      }),

    fetch(
      "/api/events/financial-summary"
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Financial API returned ${response.status}`
          )
        }

        return response.json()

      })

  ])
    .then(([eventsData, financialData]) => {

      console.log(
        "Events data:",
        eventsData
      )

      console.log(
        "Financial data:",
        financialData
      )


      let events =
        Array.isArray(eventsData)
          ? eventsData
          : eventsData.events || []


      let available =
        Number(
          financialData.availableFund || 0
        )

      let allocated =
        Number(
          financialData.allocatedFund || 0
        )

      let remaining =
        Number(
          financialData.remainingFund || 0
        )


      let availableFund =
        document.getElementById(
          "availableFund"
        )

      let allocatedFund =
        document.getElementById(
          "allocatedFund"
        )

      let remainingFund =
        document.getElementById(
          "remainingFund"
        )


      if (availableFund) {

        availableFund.textContent =
          `₱${available.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }


      if (allocatedFund) {

        allocatedFund.textContent =
          `₱${allocated.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }


      if (remainingFund) {

        remainingFund.textContent =
          `₱${remaining.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }


      tableBody.innerHTML = ""


      if (events.length === 0) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="5">
              No events found.
            </td>
          </tr>
        `

        return
      }


      for (let event of events) {

        let row =
          document.createElement(
            "tr"
          )


        let eventName =
          document.createElement(
            "td"
          )

        eventName.textContent =
          event.event_name


        let eventDate =
          document.createElement(
            "td"
          )

        eventDate.textContent =
          new Date(
            event.event_date
          ).toLocaleDateString(
            "en-US",
            {
              month: "long",
              day: "numeric",
              year: "numeric"
            }
          )


        let location =
          document.createElement(
            "td"
          )

        location.textContent =
          event.location || "—"


        let status =
          document.createElement(
            "td"
          )

        status.textContent =
          event.status


        let actions =
          document.createElement(
            "td"
          )


        /*
         * PRE-AUDIT RULE
         *
         * Planning = enabled
         * All other statuses = locked
         */

        let preAuditLocked =
          event.status !== "Planning" &&
          event.status !== "Completed"

        /*
         * ALLOCATED FUND RULE
         *
         * Approved = shown
         * Ready = shown
         * On-going = shown
         *
         * Planning = hidden
         * Completed = hidden
         * Cancelled = hidden
         */

        let showAllocatedFund =
          event.status === "Approved" ||
          event.status === "Ready" ||
          event.status === "On-going"


        actions.innerHTML = `
          <div
            style="
              display: flex;
              align-items: center;
              gap: 8px;
            "
          >

            ${
              event.status === "Completed"
                ? `
                  <button
                    type="button"
                    class="secondary-button"
                    data-event-id="${event.id}"
                    data-action="post-audit"
                  >
                    Post-Audit
                  </button>
                `
                : preAuditLocked
                  ? `
                    <button
                      type="button"
                      class="secondary-button"
                      disabled
                      style="
                        opacity: 0.55;
                        cursor: not-allowed;
                      "
                    >
                      Pre-Audit Locked
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="secondary-button"
                      data-event-id="${event.id}"
                      data-action="pre-audit"
                    >

                      Pre-Audit
                    </button>
                  `
            }


            ${
              showAllocatedFund
                ? `
                  <span
                    style="
                      font-size: 13px;
                      font-weight: 600;
                      color: #374151;
                      white-space: nowrap;
                    "
                  >
                    Allocated Fund:
                    ₱${Number(
                      event.approved_allocation ??
                      event.approvedAllocation ??
                      0
                    ).toLocaleString(
                      "en-PH",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }
                    )}
                  </span>
                `
                : ""
            }


            <div
              class="event-menu-container"
              style="
                position: relative;
              "
            >

              <button
                type="button"
                class="event-menu-toggle"
                data-menu-toggle="${event.id}"
                style="
                  border: none;
                  background: transparent;
                  padding: 6px 9px;
                  font-size: 20px;
                  line-height: 1;
                  cursor: pointer;
                  color: #6b7280;
                  border-radius: 6px;
                "
                aria-label="Event actions"
              >
                ⋮
              </button>


              <div
                class="event-menu"
                data-menu="${event.id}"
                style="
                  display: none;
                  position: absolute;
                  right: 0;
                  top: calc(100% + 5px);
                  min-width: 180px;
                  background: white;
                  border: 1px solid #e5e7eb;
                  border-radius: 8px;
                  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
                  padding: 5px;
                  z-index: 50;
                "
              >

                <button
                  type="button"
                  class="event-menu-item"
                  data-event-action="cancel"
                  data-event-id="${event.id}"
                >
                  Cancel Event
                </button>


                <button
                  type="button"
                  class="event-menu-item"
                  data-event-action="delete"
                  data-event-id="${event.id}"
                >
                  Delete Event
                </button>


                <div
                  style="
                    padding: 7px 10px 4px;
                    color: #6b7280;
                    font-size: 11px;
                    font-weight: 600;
                  "
                >
                  Change Status
                </div>


                <button
                  type="button"
                  class="event-menu-item"
                  data-event-action="status"
                  data-event-id="${event.id}"
                  data-status="Ready"
                >
                  Ready
                </button>


                <button
                  type="button"
                  class="event-menu-item"
                  data-event-action="status"
                  data-event-id="${event.id}"
                  data-status="On-going"
                >
                  On-going
                </button>


                <button
                  type="button"
                  class="event-menu-item"
                  data-event-action="status"
                  data-event-id="${event.id}"
                  data-status="Completed"
                >
                  Completed
                </button>

              </div>

            </div>

          </div>
        `


        row.appendChild(
          eventName
        )

        row.appendChild(
          eventDate
        )

        row.appendChild(
          location
        )

        row.appendChild(
          status
        )

        row.appendChild(
          actions
        )

        tableBody.appendChild(
          row
        )

      }

    })
    .catch(error => {

      console.error(
        "Failed to load Events:",
        error
      )

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            Failed to load events.
          </td>
        </tr>
      `

    })
}

document.addEventListener("click", function(event) {

  let button =
    event.target.closest(
      '[data-action="post-audit"]'
    )

  if (!button) {
    return
  }

  let eventId =
    button.dataset.eventId

  window.open(
    `post-audit.html?eventId=${eventId}`,
    "_blank"
  )

})




// =========================================================
// EVENTS — INITIALIZE PAGE
// =========================================================

function initializeEventsPage() {

  let addEventButton =
    document.getElementById(
      "addEventButton"
    )

  let eventModal =
    document.getElementById(
      "eventModal"
    )

  let closeEventModal =
    document.getElementById(
      "closeEventModal"
    )

  let cancelEventButton =
    document.getElementById(
      "cancelEventButton"
    )

  let eventForm =
    document.getElementById(
      "eventForm"
    )

  let eventsTableBody =
    document.getElementById(
      "eventsTableBody"
    )

    let recordTransactionButton =
    document.getElementById(
      "recordTransactionButton"
    )

  let transactionModal =
    document.getElementById(
      "transactionModal"
    )

  let closeTransactionModal =
    document.getElementById(
      "closeTransactionModal"
    )

  let cancelTransactionButton =
    document.getElementById(
      "cancelTransactionButton"
    )

  let transactionForm =
    document.getElementById(
      "transactionForm"
    )

  let transactionType =
  document.getElementById(
    "transactionType"
  )

  let transactionEvent =
    document.getElementById(
      "transactionEvent"
    )


      /* =========================================
     TRANSACTION MODAL
     ========================================= */

  if (
    recordTransactionButton &&
    transactionModal
  ) {

    recordTransactionButton.addEventListener(
      "click",
      function() {

        transactionForm.reset()

        transactionModal.classList.add(
          "show"
        )

        loadTransactionEvents()

        setTransactionDate()

        updateTransactionSpendingLimit()

      }
    )

  }


  /* =========================================
     CLOSE TRANSACTION MODAL
     ========================================= */

    if (closeTransactionModal) {

    closeTransactionModal.addEventListener(
      "click",
      function() {

        transactionForm.reset()

        transactionModal.classList.remove(
          "show"
        )

        updateTransactionSpendingLimit()

      }
    )

  }


    if (cancelTransactionButton) {

    cancelTransactionButton.addEventListener(
      "click",
      function() {

        transactionForm.reset()

        transactionModal.classList.remove(
          "show"
        )

        updateTransactionSpendingLimit()

      }
    )

  }


  if (transactionModal) {

    transactionModal.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          transactionModal
        ) {

          transactionModal.classList.remove(
            "show"
          )

        }

      }
    )

  }


  /* =========================================
     TRANSACTION SPENDING LIMIT
     ========================================= */

   if (transactionType) {

    transactionType.addEventListener(
      "change",
      function() {

        updateTransactionSpendingLimit()

      }
    )

  }

    if (transactionEvent) {

    transactionEvent.addEventListener(
      "change",
      function() {

        if (
          transactionType &&
          transactionType.value ===
          "Expense"
        ) {

          updateTransactionSpendingLimit()

        }

      }
    )

  }

  /* =========================================
     SAVE TRANSACTION
     ========================================= */

  if (transactionForm) {

    transactionForm.addEventListener(
      "submit",
      function(event) {

        event.preventDefault()

        saveEventTransaction()

      }
    )

  }
    
  /* =========================================
     ADD EVENT MODAL
     ========================================= */

  if (
    addEventButton &&
    eventModal
  ) {

    addEventButton.addEventListener(
      "click",
      function() {

        eventModal.classList.add(
          "show"
        )

      }
    )

  }


  /* =========================================
     CLOSE EVENT MODAL
     ========================================= */

  if (closeEventModal) {

    closeEventModal.addEventListener(
      "click",
      function() {

        eventModal.classList.remove(
          "show"
        )

      }
    )

  }


  if (cancelEventButton) {

    cancelEventButton.addEventListener(
      "click",
      function() {

        eventModal.classList.remove(
          "show"
        )

      }
    )

  }


  /* =========================================
     CLOSE WHEN CLICKING OUTSIDE
     ========================================= */

  if (eventModal) {

    eventModal.addEventListener(
      "click",
      function(event) {

        if (
          event.target ===
          eventModal
        ) {

          eventModal.classList.remove(
            "show"
          )

        }

      }
    )

  }


  /* =========================================
     ADD EVENT
     ========================================= */

  if (eventForm) {

    eventForm.addEventListener(
      "submit",
      function(event) {

        event.preventDefault()


        let eventName =
          document.getElementById(
            "eventName"
          ).value.trim()

        let eventDate =
          document.getElementById(
            "eventDate"
          ).value

        let eventLocation =
          document.getElementById(
            "eventLocation"
          ).value.trim()

        let eventDescription =
          document.getElementById(
            "eventDescription"
          ).value.trim()


        fetch(
          "/api/events",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              eventName:
                eventName,

              eventDate:
                eventDate,

              location:
                eventLocation,

              description:
                eventDescription
            })
          }
        )
          .then(response => {

            if (!response.ok) {
              throw new Error(
                "Failed to create event."
              )
            }

            return response.json()

          })
          .then(() => {

            eventForm.reset()

            eventModal.classList.remove(
              "show"
            )

            loadEvents()

          })
          .catch(error => {

            console.error(
              "Failed to create event:",
              error
            )

            alert(
              "Failed to create event."
            )

          })

      }
    )

  }


  /* =========================================
     PRE-AUDIT BUTTON
     ========================================= */

  if (eventsTableBody) {
  eventsTableBody.addEventListener(
    "click",
    function(event) {

      // ================================
      // THREE-DOT MENU TOGGLE
      // ================================
      let menuToggle =
        event.target.closest(
          "[data-menu-toggle]"
        )

      if (menuToggle) {
        event.stopPropagation()

        let eventId =
          menuToggle.dataset.menuToggle

        let menu =
          document.querySelector(
            `[data-menu="${eventId}"]`
          )

        if (!menu) {
          console.error(
            "Event menu not found:",
            eventId
          )

          return
        }

        document
          .querySelectorAll(".event-menu")
          .forEach(openMenu => {
            if (openMenu !== menu) {
              openMenu.style.display = "none"
            }
          })

        if (menu.style.display === "block") {
          menu.style.display = "none"
        } else {
          menu.style.display = "block"
        }

        return
      }


      // ================================
      // MENU ACTIONS
      // ================================
      let menuAction =
        event.target.closest(
          "[data-event-action]"
        )

      if (menuAction) {
        event.stopPropagation()

        let eventId =
          menuAction.dataset.eventId

        let action =
          menuAction.dataset.eventAction

        // CANCEL EVENT
        if (action === "cancel") {
          if (
            !confirm(
              "Are you sure you want to cancel this event?"
            )
          ) {
            return
          }

          fetch(
            `/api/events/${eventId}/cancel`,
            {
              method: "POST"
            }
          )
            .then(response => {
              if (!response.ok) {
                throw new Error(
                  "Failed to cancel event."
                )
              }

              return response.json()
            })
            .then(() => {
              loadEvents()
            })
            .catch(error => {
              console.error(error)

              alert(
                "Failed to cancel event."
              )
            })

          return
        }


        // DELETE EVENT
        if (action === "delete") {
          if (
            !confirm(
              "Are you sure you want to delete this event?"
            )
          ) {
            return
          }

          fetch(
            `/api/events/${eventId}`,
            {
              method: "DELETE"
            }
          )
            .then(response => {
              if (!response.ok) {
                throw new Error(
                  "Failed to delete event."
                )
              }

              return response.json()
            })
            .then(() => {
              loadEvents()
            })
            .catch(error => {
              console.error(error)

              alert(
                "Failed to delete event."
              )
            })

          return
        }


        // CHANGE STATUS
        if (action === "status") {
          let status =
            menuAction.dataset.status

          fetch(
            `/api/events/${eventId}/status`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                status: status
              })
            }
          )
            .then(response => {
              if (!response.ok) {
                throw new Error(
                  "Failed to change event status."
                )
              }

              return response.json()
            })
            .then(() => {
              loadEvents()
            })
            .catch(error => {
              console.error(error)

              alert(
                "Failed to change event status."
              )
            })

          return
        }

        return
      }


      // ================================
      // PRE-AUDIT
      // ================================
      let preAuditButton =
        event.target.closest(
          "[data-event-id]:not([data-event-action]):not([data-menu-toggle])"
        )

      if (!preAuditButton) {
        return
      }

      let eventId =
        preAuditButton.dataset.eventId

      fetch(
        `/api/events`
      )
        .then(response => {
          if (!response.ok) {
            throw new Error(
              "Failed to load event."
            )
          }

          return response.json()
        })
        .then(data => {

          let events =
            Array.isArray(data)
              ? data
              : data.events || []

          let selectedEvent =
            events.find(
              event =>
                String(event.id) ===
                String(eventId)
            )

          if (!selectedEvent) {
            throw new Error(
              "Event not found."
            )
          }

          openPreAudit(
            selectedEvent
          )
        })
        .catch(error => {
          console.error(
            "Failed to open Pre-Audit:",
            error
          )

          alert(
            "Failed to open Pre-Audit."
          )
        })
    }
  )
}

    let todayTransactionsTableBody =
    document.getElementById(
      "todayTransactionsTableBody"
    )

  if (
    todayTransactionsTableBody
  ) {

    todayTransactionsTableBody.addEventListener(
      "click",
      function(event) {

        let deleteButton =
          event.target.closest(
            "[data-delete-transaction-id]"
          )

        if (!deleteButton) {
          return
        }

        let transactionId =
          deleteButton.dataset
            .deleteTransactionId

        deleteEventTransaction(
          transactionId
        )

      }
    )

  }
  
  loadTodayTransactions()
}


let currentPreAuditEventId = null


function openPreAudit(event) {

  currentPreAuditEventId =
    event.id

  let modal =
    document.getElementById(
      "preAuditModal"
    )

  let eventName =
    document.getElementById(
      "preAuditEventName"
    )

  let content =
    document.getElementById(
      "preAuditContent"
    )

  if (!modal || !content) {
    console.error(
      "Pre-Audit modal elements not found."
    )

    return
  }


  if (eventName) {
    eventName.textContent =
      event.event_name
  }


  content.innerHTML = `
    <p>
      Loading financial data...
    </p>
  `


  modal.classList.add("show")


  console.log(
    "Opening Pre-Audit for event:",
    event.id
  )


    Promise.all([

    fetch("/api/fund-collection")
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Fund API returned ${response.status}`
          )
        }

        return response.json()

      }),

    fetch(
      `/api/events/${event.id}/pre-audit`
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Pre-Audit API returned ${response.status}`
          )
        }

        return response.json()

      }),

    fetch(
      "/api/events/financial-summary"
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            `Financial Summary API returned ${response.status}`
          )
        }

        return response.json()

      })

  ])
    .then(
      ([
        fundData,
        auditData,
        financialData
      ]) => {

        console.log(
          "Fund data:",
          fundData
        )

        console.log(
          "Pre-Audit data:",
          auditData
        )

        console.log(
          "Financial summary:",
          financialData
        )

        renderPreAudit(
          fundData,
          auditData,
          financialData
        )

      }
    )
    .catch(error => {

      console.error(
        "PRE-AUDIT ERROR:",
        error
      )

      content.innerHTML = `
        <div
          style="
            padding: 15px;
            background: #fef2f2;
            border-radius: 8px;
          "
        >

          <strong>
            Failed to load Pre-Audit.
          </strong>

          <p
            style="
              margin-top: 8px;
            "
          >
            ${error.message}
          </p>

        </div>
      `

    })
}

function renderPreAudit(
  fundData,
  auditData,
  financialData
) {

  let allocatedFund =
    Number(
      financialData.allocatedFund || 0
    )

  let remainingFund =
    Number(
      financialData.remainingFund || 0
    )
  
  let availableFund =
    Number(
      financialData.remainingFund || 0
    )

  let totalIncome =
    Number(
      auditData.totalIncome || 0
    )

  let totalExpenses =
    Number(
      auditData.totalExpenses || 0
    )

  let projectedFund =
    availableFund +
    totalIncome -
    totalExpenses

  let feasibility =
    projectedFund >= 0

  let expectedNetIncome =
    totalIncome - totalExpenses

  let budgetUtilization =
    availableFund > 0
      ? (totalExpenses / availableFund) * 100
      : 0

  let content =
    document.getElementById(
      "preAuditContent"
    )

  if (!content) {
    return
  }

  let incomeRows = ""

  for (
    let income of auditData.income || []
  ) {

    incomeRows += `
      <div
        style="
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid #e5e7eb;
        "
      >

        <span>
          ${income.description}
        </span>

        <strong>
          ₱${Number(
            income.amount
          ).toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </strong>

        <div
          style="
            display: flex;
            gap: 6px;
          "
        >

          <button
            type="button"
            class="secondary-button pre-audit-edit"
            data-type="income"
            data-id="${income.id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="secondary-button pre-audit-delete"
            data-type="income"
            data-id="${income.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `
  }

  let expenseRows = ""

  for (
    let expense of auditData.expenses || []
  ) {

    expenseRows += `
      <div
        style="
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 12px;
          align-items: center;
          padding: 11px 0;
          border-bottom: 1px solid #e5e7eb;
        "
      >

        <span>
          ${expense.description}
        </span>

        <strong>
          ₱${Number(
            expense.amount
          ).toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </strong>

        <div
          style="
            display: flex;
            gap: 6px;
          "
        >

          <button
            type="button"
            class="secondary-button pre-audit-edit"
            data-type="expense"
            data-id="${expense.id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="secondary-button pre-audit-delete"
            data-type="expense"
            data-id="${expense.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `
  }

  content.innerHTML = `

    <!-- FINANCIAL SUMMARY -->

    <div class="dashboard-grid">

      <div class="module-card">

        <h3>Available Fund</h3>

        <div class="module-card-value">
          ₱${availableFund.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </div>

        <p>
          Current available fund
        </p>

      </div>


      <div class="module-card">

        <h3>Expected Income</h3>

        <div class="module-card-value">
          ₱${totalIncome.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </div>

        <p>
          Planned event income
        </p>

      </div>


      <div class="module-card">

        <h3>Expected Expenses</h3>

        <div class="module-card-value">
          ₱${totalExpenses.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </div>

        <p>
          Planned event expenses
        </p>

      </div>


      <div class="module-card">

        <h3>Projected Fund</h3>

        <div class="module-card-value">
          ₱${projectedFund.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}
        </div>

        <p>
          After expected income and expenses
        </p>

      </div>

    </div>


    <!-- FEASIBILITY -->

    <div
      style="
        margin-top: 5px;
        padding: 16px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #f9fafb;
      "
    >

      <strong>
        ${
          feasibility
            ? "✓ Financially Feasible"
            : "✕ Insufficient Funds"
        }
      </strong>

      <p
        style="
          margin-top: 5px;
          color: #6b7280;
          font-size: 13px;
        "
      >
        ${
          feasibility
            ? "The projected event finances are within the available fund."
            : "The expected expenses exceed the available fund and expected income."
        }
      </p>

    </div>


<!-- IMPORTANT FINANCIAL DETAILS -->

<div
  style="
    margin-top: 20px;
    padding: 18px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: white;
  "
>

  <h3
    style="
      margin-bottom: 15px;
    "
  >
    Important Financial Details
  </h3>


  <div
    style="
      display: grid;
      grid-template-columns: repeat(
        2,
        minmax(0, 1fr)
      );
      gap: 12px;
    "
  >

    <!-- EXPECTED NET INCOME -->

    <div
      style="
        padding: 14px;
        border-radius: 8px;
        background: #f9fafb;
      "
    >

      <p
        style="
          margin: 0;
          color: #6b7280;
          font-size: 12px;
        "
      >
        Expected Net Income
      </p>

      <strong
        style="
          display: block;
          margin-top: 5px;
          font-size: 20px;
        "
      >
        ₱${expectedNetIncome.toLocaleString(
          "en-PH",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }
        )}
      </strong>

      <p
        style="
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
        "
      >
        Expected income minus expected expenses
      </p>

    </div>


    <!-- BUDGET UTILIZATION -->

    <div
      style="
        padding: 14px;
        border-radius: 8px;
        background: #f9fafb;
      "
    >

      <p
        style="
          margin: 0;
          color: #6b7280;
          font-size: 12px;
        "
      >
        Budget Utilization
      </p>

      <strong
        style="
          display: block;
          margin-top: 5px;
          font-size: 20px;
        "
      >
        ${budgetUtilization.toFixed(2)}%
      </strong>

      <p
        style="
          margin-top: 4px;
          color: #6b7280;
          font-size: 12px;
        "
      >
        Expected expenses compared with available fund
      </p>

    </div>

  </div>

</div>


    
        <!-- APPROVAL -->

    <div
      style="
        margin-top: 25px;
        padding: 18px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #f9fafb;
      "
    >

      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
        "
      >

        <div>

          <h3>
            Event Approval
          </h3>

          <p
            style="
              margin-top: 5px;
              color: #6b7280;
              font-size: 13px;
            "
          >
            Set the amount that will be reserved from the available fund.
          </p>

        </div>

        <div
          style="
            min-width: 220px;
          "
        >

          <label
            for="approvedAllocation"
            style="
              display: block;
              margin-bottom: 7px;
              font-size: 13px;
              font-weight: 600;
            "
          >
            Approved Allocation
          </label>

          <input
            type="number"
            id="approvedAllocation"
            min="0.01"
            step="0.01"
            value="${totalExpenses.toFixed(2)}"
            style="
              width: 100%;
              padding: 10px 12px;
              border: 1px solid #d1d5db;
              border-radius: 7px;
              background: white;
              font-size: 14px;
              outline: none;
              box-sizing: border-box;
            "
          >

        </div>

      </div>


      <div
        style="
          display: flex;
          justify-content: flex-end;
          margin-top: 15px;
        "
      >

        <button
          type="button"
          class="primary-button"
          id="approveEventButton"
        >
          Approve Event
        </button>

      </div>

    </div>


    <!-- EXPECTED INCOME -->

    <div style="margin-top: 25px;">
    
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        "
      >

        <h3>
          Expected Income
        </h3>

        <button
          type="button"
          class="primary-button"
          id="addExpectedIncomeButton"
        >
          + Add Income
        </button>

      </div>


      <div
        id="expectedIncomeForm"
        style="
          display: none;
          margin-bottom: 15px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
        "
      >

        <div class="form-row">

          <div class="form-group">

            <label>
              Description
            </label>

            <input
              type="text"
              id="expectedIncomeDescription"
              placeholder="e.g. Registration Fee"
            >

          </div>


          <div class="form-group">

            <label>
              Amount
            </label>

            <input
              type="number"
              id="expectedIncomeAmount"
              min="0"
              step="0.01"
              placeholder="0.00"
            >

          </div>

        </div>

        <div class="modal-actions">

          <button
            type="button"
            class="secondary-button"
            id="cancelExpectedIncomeButton"
          >
            Cancel
          </button>

          <button
            type="button"
            class="primary-button"
            id="saveExpectedIncomeButton"
          >
            Save Income
          </button>

        </div>

      </div>


      ${
        incomeRows ||
        "<p style='color: #6b7280;'>No expected income recorded.</p>"
      }

    </div>


    <!-- EXPECTED EXPENSES -->

    <div style="margin-top: 25px;">

      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        "
      >

        <h3>
          Expected Expenses
        </h3>

        <button
          type="button"
          class="primary-button"
          id="addExpectedExpenseButton"
        >
          + Add Expense
        </button>

      </div>


      <div
        id="expectedExpenseForm"
        style="
          display: none;
          margin-bottom: 15px;
          padding: 15px;
          background: #f9fafb;
          border-radius: 8px;
        "
      >

        <div class="form-row">

          <div class="form-group">

            <label>
              Description
            </label>

            <input
              type="text"
              id="expectedExpenseDescription"
              placeholder="e.g. Venue Rental"
            >

          </div>


          <div class="form-group">

            <label>
              Amount
            </label>

            <input
              type="number"
              id="expectedExpenseAmount"
              min="0"
              step="0.01"
              placeholder="0.00"
            >

          </div>

        </div>


        <div class="modal-actions">

          <button
            type="button"
            class="secondary-button"
            id="cancelExpectedExpenseButton"
          >
            Cancel
          </button>

          <button
            type="button"
            class="primary-button"
            id="saveExpectedExpenseButton"
          >
            Save Expense
          </button>

        </div>

      </div>


      ${
        expenseRows ||
        "<p style='color: #6b7280;'>No expected expenses recorded.</p>"
      }

    </div>

  `
}

function initializePreAuditModal() {

  let modal =
    document.getElementById(
      "preAuditModal"
    )

  let closeButton =
    document.getElementById(
      "closePreAuditModal"
    )

  let content =
    document.getElementById(
      "preAuditContent"
    )

  if (!modal || !content) {
    console.error(
      "Pre-Audit modal elements not found."
    )

    return
  }


  /* =========================================================
     CLOSE PRE-AUDIT
     ========================================================= */

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      function() {

        modal.classList.remove(
          "show"
        )

      }
    )

  }


  /* =========================================================
     CLOSE WHEN CLICKING OUTSIDE MODAL
     ========================================================= */

  modal.addEventListener(
    "click",
    function(event) {

      if (
        event.target === modal
      ) {

        modal.classList.remove(
          "show"
        )

      }

    }
  )


  /* =========================================================
     DELEGATED EVENTS
     
     IMPORTANT:
     The Pre-Audit content is recreated by
     renderPreAudit(), so buttons inside it
     must use event delegation.
     ========================================================= */

  content.addEventListener(
    "click",
    function(event) {

      let target =
        event.target


      /* -----------------------------------------
         ADD EXPECTED INCOME
         ----------------------------------------- */

      if (
        target.id ===
        "addExpectedIncomeButton"
      ) {

        let form =
          document.getElementById(
            "expectedIncomeForm"
          )

        if (form) {
          form.style.display =
            "block"
        }

        return
      }


      /* -----------------------------------------
         CANCEL EXPECTED INCOME
         ----------------------------------------- */

      if (
        target.id ===
        "cancelExpectedIncomeButton"
      ) {

        let form =
          document.getElementById(
            "expectedIncomeForm"
          )

        if (form) {

          form.style.display =
            "none"

          form.removeAttribute(
            "data-editing-id"
          )

        }

        return
      }


      /* -----------------------------------------
         ADD EXPECTED EXPENSE
         ----------------------------------------- */

      if (
        target.id ===
        "addExpectedExpenseButton"
      ) {

        let form =
          document.getElementById(
            "expectedExpenseForm"
          )

        if (form) {
          form.style.display =
            "block"
        }

        return
      }


      /* -----------------------------------------
         CANCEL EXPECTED EXPENSE
         ----------------------------------------- */

      if (
        target.id ===
        "cancelExpectedExpenseButton"
      ) {

        let form =
          document.getElementById(
            "expectedExpenseForm"
          )

        if (form) {

          form.style.display =
            "none"

          form.removeAttribute(
            "data-editing-id"
          )

        }

        return
      }


            /* -----------------------------------------
         APPROVE EVENT
         ----------------------------------------- */

      if (
        target.id ===
        "approveEventButton"
      ) {

        approveEvent()

        return
      }

      /* -----------------------------------------
         SAVE EXPECTED INCOME
         ----------------------------------------- */

      if (
        target.id ===
        "saveExpectedIncomeButton"
      ) {

        saveExpectedIncome()

        return
      }


      /* -----------------------------------------
         SAVE EXPECTED EXPENSE
         ----------------------------------------- */

      if (
        target.id ===
        "saveExpectedExpenseButton"
      ) {

        saveExpectedExpense()

        return
      }


      /* -----------------------------------------
         EDIT
         ----------------------------------------- */

      let editButton =
        target.closest(
          ".pre-audit-edit"
        )

      if (editButton) {

        let type =
          editButton.dataset.type

        let id =
          editButton.dataset.id

        editPreAuditItem(
          type,
          id
        )

        return
      }


      /* -----------------------------------------
         DELETE
         ----------------------------------------- */

      let deleteButton =
        target.closest(
          ".pre-audit-delete"
        )

      if (deleteButton) {

        let type =
          deleteButton.dataset.type

        let id =
          deleteButton.dataset.id

        console.log(
          "Deleting Pre-Audit item:",
          {
            type: type,
            id: id
          }
        )

        deletePreAuditItem(
          type,
          id
        )

        return
      }

    }
  )

}

// =========================================================
// EVENTS — APPROVE EVENT
// =========================================================

function approveEvent() {

  if (!currentPreAuditEventId) {

    alert(
      "No event selected."
    )

    return
  }


  let allocationInput =
    document.getElementById(
      "approvedAllocation"
    )


  if (!allocationInput) {

    alert(
      "Approved allocation field not found."
    )

    return
  }


  let approvedAllocation =
    Number(
      allocationInput.value
    )


  if (
    !Number.isFinite(
      approvedAllocation
    ) ||
    approvedAllocation <= 0
  ) {

    alert(
      "Please enter a valid approved allocation."
    )

    return
  }


  let confirmed =
    confirm(
      `Approve this event with an allocation of ₱${approvedAllocation.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}?`
    )


  if (!confirmed) {
    return
  }


  fetch(
    `/api/events/${currentPreAuditEventId}/approve`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        approvedAllocation:
          approvedAllocation

      })
    }
  )
    .then(response => {

      return response.json()
        .then(data => {

          if (!response.ok) {

            throw new Error(
              data.error ||
              "Failed to approve event."
            )

          }

          return data

        })

    })
    .then(data => {

      alert(
        "Event approved successfully."
      )


      console.log(
        "Approved event:",
        data
      )


      let modal =
        document.getElementById(
          "preAuditModal"
        )


      if (modal) {

        modal.classList.remove(
          "show"
        )

      }


      loadEvents()

    })
    .catch(error => {

      console.error(
        "Approve event error:",
        error
      )

      alert(
        error.message ||
        "Failed to approve event."
      )

    })
}

// =========================================================
// PRE-AUDIT — SAVE EXPECTED INCOME
// =========================================================

function saveExpectedIncome() {

  let descriptionInput =
    document.getElementById(
      "expectedIncomeDescription"
    )

  let amountInput =
    document.getElementById(
      "expectedIncomeAmount"
    )

  let form =
    document.getElementById(
      "expectedIncomeForm"
    )

  let description =
    descriptionInput.value.trim()

  let amount =
    Number(
      amountInput.value
    )

  if (!description) {

    alert(
      "Please enter an income description."
    )

    return
  }

  if (!amount || amount <= 0) {

    alert(
      "Please enter a valid income amount."
    )

    return
  }


  let editingId =
    form.dataset.editingId


  let endpoint =
    editingId
      ? `/api/event-expected-income/${editingId}`
      : "/api/event-expected-income"

  let method =
    editingId
      ? "PUT"
      : "POST"


  fetch(
    endpoint,
    {
      method: method,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        eventId:
          currentPreAuditEventId,

        description:
          description,

        amount:
          amount

      })
    }
  )
    .then(response => {

      if (!response.ok) {

        return response.json()
          .then(data => {

            throw new Error(
              data.error ||
              "Failed to save expected income."
            )

          })

      }

      return response.json()
    })
    .then(() => {

      descriptionInput.value =
        ""

      amountInput.value =
        ""

      form.style.display =
        "none"

      delete form.dataset.editingId

      refreshPreAudit()

    })
    .catch(error => {

      console.error(
        "Save expected income error:",
        error
      )

      alert(
        error.message ||
        "Failed to save expected income."
      )

    })
}

// =========================================================
// PRE-AUDIT — SAVE EXPECTED EXPENSE
// =========================================================

function saveExpectedExpense() {

  let descriptionInput =
    document.getElementById(
      "expectedExpenseDescription"
    )

  let amountInput =
    document.getElementById(
      "expectedExpenseAmount"
    )

  let form =
    document.getElementById(
      "expectedExpenseForm"
    )

  let description =
    descriptionInput.value.trim()

  let amount =
    Number(
      amountInput.value
    )

  if (!description) {

    alert(
      "Please enter an expense description."
    )

    return
  }

  if (!amount || amount <= 0) {

    alert(
      "Please enter a valid expense amount."
    )

    return
  }


  let editingId =
    form.dataset.editingId


  let endpoint =
    editingId
      ? `/api/event-expected-expenses/${editingId}`
      : "/api/event-expected-expenses"

  let method =
    editingId
      ? "PUT"
      : "POST"


  fetch(
    endpoint,
    {
      method: method,

      headers: {
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        eventId:
          currentPreAuditEventId,

        description:
          description,

        amount:
          amount

      })
    }
  )
    .then(response => {

      if (!response.ok) {

        return response.json()
          .then(data => {

            throw new Error(
              data.error ||
              "Failed to save expected expense."
            )

          })

      }

      return response.json()
    })
    .then(() => {

      descriptionInput.value =
        ""

      amountInput.value =
        ""

      form.style.display =
        "none"

      delete form.dataset.editingId

      refreshPreAudit()

    })
    .catch(error => {

      console.error(
        "Save expected expense error:",
        error
      )

      alert(
        error.message ||
        "Failed to save expected expense."
      )

    })
}

// =========================================================
// PRE-AUDIT — DELETE ITEM
// =========================================================

function deletePreAuditItem(
  type,
  id
) {

  let itemName =
    type === "income"
      ? "expected income"
      : "expected expense"

  let confirmed =
    confirm(
      `Delete this ${itemName}?`
    )

  if (!confirmed) {
    return
  }

  let endpoint =
    type === "income"
      ? `/api/event-expected-income/${id}`
      : `/api/event-expected-expenses/${id}`

  fetch(
    endpoint,
    {
      method: "DELETE"
    }
  )
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to delete record."
        )
      }

      return response.json()
    })
    .then(() => {

      refreshPreAudit()

    })
    .catch(error => {

      console.error(
        "Delete Pre-Audit item error:",
        error
      )

      alert(
        "Failed to delete record."
      )

    })
}


// =========================================================
// PRE-AUDIT — EDIT ITEM
// =========================================================

function editPreAuditItem(
  type,
  id
) {

  let endpoint =
    type === "income"
      ? `/api/events/${currentPreAuditEventId}/pre-audit`
      : `/api/events/${currentPreAuditEventId}/pre-audit`

  fetch(endpoint)
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load record."
        )
      }

      return response.json()
    })
    .then(data => {

      let items =
        type === "income"
          ? data.income
          : data.expenses

      let item =
        items.find(
          record =>
            String(record.id) ===
            String(id)
        )

      if (!item) {
        throw new Error(
          "Record not found."
        )
      }

      if (type === "income") {

        let form =
          document.getElementById(
            "expectedIncomeForm"
          )

        let description =
          document.getElementById(
            "expectedIncomeDescription"
          )

        let amount =
          document.getElementById(
            "expectedIncomeAmount"
          )

        description.value =
          item.description

        amount.value =
          item.amount

        form.style.display =
          "block"

        form.dataset.editingId =
          id

      } else {

        let form =
          document.getElementById(
            "expectedExpenseForm"
          )

        let description =
          document.getElementById(
            "expectedExpenseDescription"
          )

        let amount =
          document.getElementById(
            "expectedExpenseAmount"
          )

        description.value =
          item.description

        amount.value =
          item.amount

        form.style.display =
          "block"

        form.dataset.editingId =
          id

      }

    })
    .catch(error => {

      console.error(
        "Edit Pre-Audit item error:",
        error
      )

      alert(
        "Failed to load record."
      )

    })
}


// =========================================================
// PRE-AUDIT — REFRESH
// =========================================================

function refreshPreAudit() {

  if (!currentPreAuditEventId) {
    return
  }

  Promise.all([

    fetch("/api/fund-collection")
      .then(response => {

        if (!response.ok) {
          throw new Error(
            "Failed to load fund."
          )
        }

        return response.json()
      }),

    fetch(
      `/api/events/${currentPreAuditEventId}/pre-audit`
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            "Failed to load audit."
          )
        }

        return response.json()
      }),

    fetch(
      "/api/events/financial-summary"
    )
      .then(response => {

        if (!response.ok) {
          throw new Error(
            "Failed to load financial summary."
          )
        }

        return response.json()
      })

  ])
    .then(
      ([
        fundData,
        auditData,
        financialData
      ]) => {

        renderPreAudit(
          fundData,
          auditData,
          financialData
        )

        loadEvents()

      }
    )
    .catch(error => {

      console.error(
        "Failed to refresh Pre-Audit:",
        error
      )

    })
}

// =========================================================
// DASHBOARD
// =========================================================

function loadDashboard() {

  pageContent.innerHTML = `
    <div class="module-page">

      <div class="module-header">
        </div>
      </div>

      <div class="dashboard-grid">

        <div class="module-card">
          <h3>Total Students</h3>

          <div
            class="module-card-value"
            id="dashboardTotalStudents"
          >
            —
          </div>

          <p>
            Registered students
          </p>
        </div>


        <div class="module-card">
          <h3>Fund Collected</h3>

          <div
            class="module-card-value"
            id="dashboardTotalCollected"
          >
            —
          </div>

          <p>
            Current fund collection
          </p>
        </div>


        <div class="module-card">
          <h3>Available Fund</h3>

          <div
            class="module-card-value"
            id="dashboardAvailableFund"
          >
            —
          </div>

          <p>
            Current available fund
          </p>
        </div>


        <div class="module-card">
          <h3>Total Events</h3>

          <div
            class="module-card-value"
            id="dashboardTotalEvents"
          >
            —
          </div>

          <p>
            Recorded events
          </p>
        </div>

      </div>


      <div class="module-section">

        <div class="module-section-header">
          <div>
            <h3>Financial Analytics</h3>
            <p>
              Visual overview of the current financial position.
            </p>
          </div>
        </div>

        <div class="module-grid">

          <div class="module-card">
            <h3>Fund Collection</h3>

            <div class="chart-container">
              <canvas id="fundCollectionChart"></canvas>
            </div>
          </div>


          <div class="module-card">
            <h3>Student Payment Status</h3>

            <div class="chart-container">
              <canvas id="studentPaymentChart"></canvas>
            </div>
          </div>

        </div>


        <div class="module-grid">

          <div class="module-card">
            <h3>Fund Position</h3>

            <div class="chart-container">
              <canvas id="fundPositionChart"></canvas>
            </div>
          </div>


          <div class="module-card">
            <h3>Events Overview</h3>

            <div class="chart-container">
              <canvas id="eventsOverviewChart"></canvas>
            </div>
          </div>

        </div>

      </div>


    </div>
  `
  loadDashboardData()
  createFundCollectionChart()
  createStudentPaymentChart()
  createFundPositionChart()
  createEventsOverviewChart()
    
    fetch("/api/events")
  .then(response => response.json())
  .then(events => {

    let totalEvents =
      document.getElementById(
        "dashboardTotalEvents"
      )

    totalEvents.textContent =
      events.events.length

  })
  .catch(error => {
    console.error(
      "Dashboard events error:",
      error
    )
  })
}

function loadDashboardData() {

  fetch("/api/students")
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load dashboard students."
        )
      }

      return response.json()
    })
    .then(students => {

      let totalStudents =
        document.getElementById(
          "dashboardTotalStudents"
        )

      if (totalStudents) {
        totalStudents.textContent =
          students.length
      }

      return fetch(
        `/api/fund-collection?schoolYear=${
          encodeURIComponent(
            localStorage.getItem(
              "activeSchoolYear"
            ) || "2026-2027"
          )
        }`
      )

    })
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load dashboard fund collection."
        )
      }

      return response.json()

    })
    .then(data => {

      let totalCollected =
        document.getElementById(
          "dashboardTotalCollected"
        )

      if (totalCollected) {

        totalCollected.textContent =
          `₱${Number(
            data.totalCollected
          ).toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }

    })
    .then(() => {

      return fetch(
        "/api/events/financial-summary"
      )

    })
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load dashboard financial summary."
        )
      }

      return response.json()

    })
    .then(data => {

      let availableFund =
        document.getElementById(
          "dashboardAvailableFund"
        )

      if (availableFund) {

        availableFund.textContent =
          `₱${Number(
            data.currentAvailableFund ??
            data.availableFund ??
            0
          ).toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )}`

      }

    })

    .catch(error => {

      console.error(
        "Dashboard student data error:",
        error
      )

    })
}

function createFundCollectionChart() {

  let canvas =
    document.getElementById(
      "fundCollectionChart"
    )

  if (!canvas) {
    return
  }

  let schoolYear =
    localStorage.getItem(
      "activeSchoolYear"
    ) || "2026-2027"

  fetch(
    `/api/fund-collection?schoolYear=${
      encodeURIComponent(
        schoolYear
      )
    }`
  )
    .then(response => response.json())
    .then(data => {

      let collected =
        Number(
          data.totalCollected || 0
        )

      let expected =
        Number(
          data.expectedCollection || 0
        )

      let remaining =
        Math.max(
          expected - collected,
          0
        )

      new Chart(canvas, {

        type: "doughnut",

        data: {
          labels: [
            "Collected",
            "Remaining"
          ],

          datasets: [
            {
              data: [
                collected,
                remaining
              ]
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              position: "bottom"
            },

            tooltip: {
              callbacks: {
                label: function(context) {

                  return (
                    `${context.label}: ₱${
                      Number(
                        context.raw
                      ).toLocaleString(
                        "en-PH",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }
                      )}`
                  )

                }
              }
            }
          }
        }

      })

    })
    .catch(error => {

      console.error(
        "Fund collection chart error:",
        error
      )

    })
}


function createStudentPaymentChart() {

  let canvas =
    document.getElementById(
      "studentPaymentChart"
    )

  if (!canvas) {
    return
  }

  let schoolYear =
    localStorage.getItem(
      "activeSchoolYear"
    ) || "2026-2027"

  fetch(
    `/api/collection-status?schoolYear=${
      encodeURIComponent(
        schoolYear
      )
    }`
  )
    .then(response => response.json())
    .then(data => {

      let fullyPaid =
        data.filter(
          student =>
            student.status ===
            "Fully Paid"
        ).length

      let partiallyPaid =
        data.filter(
          student =>
            student.status ===
            "Partially Paid"
        ).length

      let unpaid =
        data.filter(
          student =>
            student.status ===
            "Unpaid"
        ).length

      new Chart(canvas, {

        type: "doughnut",

        data: {
          labels: [
            "Fully Paid",
            "Partially Paid",
            "Unpaid"
          ],

          datasets: [
            {
              data: [
                fullyPaid,
                partiallyPaid,
                unpaid
              ]
            }
          ]
        },

        options: {
          responsive: true,
          maintainAspectRatio: false,

          plugins: {
            legend: {
              position: "bottom"
            },

            tooltip: {
              callbacks: {
                label: function(context) {

                  return (
                    `${context.label}: ${
                      context.raw
                    } students`
                  )

                }
              }
            }
          }
        }

      })

    })
    .catch(error => {

      console.error(
        "Student payment chart error:",
        error
      )

    })
}

function createFundPositionChart() {

  let canvas =
    document.getElementById(
      "fundPositionChart"
    )

  if (!canvas) {
    return
  }

  fetch(
    "/api/events/financial-summary"
  )
    .then(response => response.json())
    .then(data => {

      let availableFund =
        Number(
          data.currentAvailableFund ??
          data.availableFund ??
          0
        )

      let allocatedFund =
        Number(
          data.allocatedFund ??
          0
        )

      let remainingFund =
        Number(
          data.remainingFund ??
          availableFund -
          allocatedFund
        )

      new Chart(canvas, {

        type: "bar",

        data: {
          labels: [
            "Available Fund",
            "Allocated Fund",
            "Remaining Fund"
          ],

          datasets: [
            {
              label: "Amount",

              data: [
                availableFund,
                allocatedFund,
                remainingFund
              ]
            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false,

          scales: {

            y: {
              beginAtZero: true,

              ticks: {
                callback: function(value) {

                  return `₱${Number(
                    value
                  ).toLocaleString(
                    "en-PH"
                  )}`

                }
              }
            }

          },

          plugins: {

            legend: {
              display: false
            },

            tooltip: {

              callbacks: {

                label: function(context) {

                  return `₱${Number(
                    context.raw
                  ).toLocaleString(
                    "en-PH",
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }
                  )}`

                }

              }

            }

          }

        }

      })

    })
    .catch(error => {

      console.error(
        "Fund position chart error:",
        error
      )

    })
}

function createEventsOverviewChart() {

  let canvas =
    document.getElementById(
      "eventsOverviewChart"
    )

  if (!canvas) {
    return
  }

  fetch("/api/events")
    .then(response => response.json())
    .then(data => {

      let events =
        data.events || []

      let planning = 0
      let approved = 0
      let ready = 0
      let ongoing = 0
      let completed = 0

      events.forEach(event => {

        if (event.status === "Planning") {
          planning++
        }

        if (event.status === "Approved") {
          approved++
        }

        if (event.status === "Ready") {
          ready++
        }

        if (event.status === "On-going") {
          ongoing++
        }

        if (event.status === "Completed") {
          completed++
        }

      })

      new Chart(canvas, {

        type: "bar",

        data: {
          labels: [
            "Planning",
            "Approved",
            "Ready",
            "On-going",
            "Completed"
          ],

          datasets: [
            {
              label: "Events",

              data: [
                planning,
                approved,
                ready,
                ongoing,
                completed
              ]
            }
          ]
        },

        options: {

          responsive: true,
          maintainAspectRatio: false,

          scales: {

            y: {
              beginAtZero: true,

              ticks: {
                stepSize: 1
              }
            }

          },

          plugins: {

            legend: {
              display: false
            },

            tooltip: {

              callbacks: {

                label: function(context) {

                  return `${context.raw} event(s)`

                }

              }

            }

          }

        }

      })

    })
    .catch(error => {

      console.error(
        "Events overview chart error:",
        error
      )

    })
}

function setActiveNav(selectedItem) {
  for (let item of navItems) {
    item.classList.remove("active")
  }

  selectedItem.classList.add("active")
}


function loadStudents() {
  fetch("/api/students")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load students")
      }

      return response.json()
    })
    .then(students => {
      let tableBody = document.getElementById("studentsTableBody")

      if (!tableBody) {
        return
      }
      
      tableBody.innerHTML = ""

      for (let student of students) {
        let row = document.createElement("tr")

        row.innerHTML = `
          <td>${student.student_number}</td>

          <td>
            ${student.first_name} ${student.last_name}
          </td>

          <td>
            ${student.program || "-"}
          </td>

          <td>
            ${student.year_level || "-"}
          </td>

          <td>
            ${student.status}
          </td>

          <td>
            <button
              class="secondary-button edit-student-button"
              data-id="${student.id}"
            >
              Edit
            </button>

            <button
              class="secondary-button delete-student-button"
              data-id="${student.id}"
            >
              Delete
            </button>
          </td>
        `

        tableBody.appendChild(row)
      }

      let editButtons = document.querySelectorAll(
        ".edit-student-button"
      )

      for (let button of editButtons) {
        button.addEventListener("click", function() {
          let studentId = this.dataset.id

          openEditStudent(studentId)
        })
      }

      let deleteButtons = document.querySelectorAll(
        ".delete-student-button"
      )

      for (let button of deleteButtons) {
        button.addEventListener("click", function() {
          let studentId = this.dataset.id

          deleteStudent(studentId)
        })
      }
    })
    .catch(error => {
      console.error(error)

      let tableBody = document.getElementById("studentsTableBody")

      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Failed to load students.
          </td>
        </tr>
      `
    })
}

function openEditStudent(studentId) {

  fetch(`/api/students/${studentId}`)
    .then(response => {

      if (!response.ok) {
        throw new Error("Failed to load student")
      }

      return response.json()
    })
    .then(student => {

      document.getElementById(
        "studentModalTitle"
      ).textContent = "Edit Student"

      document.getElementById(
        "studentModalDescription"
      ).textContent =
        "Update the student's information. Enrollment information is view-only."

      document.getElementById(
        "studentNumber"
      ).value =
        student.student_number

      document.getElementById(
        "firstName"
      ).value =
        student.first_name

      document.getElementById(
        "lastName"
      ).value =
        student.last_name

      document.getElementById(
        "program"
      ).value =
        student.program || ""

      let schoolYear =
        document.getElementById(
          "studentSchoolYear"
        )

      let yearLevel =
        document.getElementById(
          "studentEnrollmentYearLevel"
        )

      if (schoolYear) {
        schoolYear.value =
          student.school_year || ""

        schoolYear.disabled = true
      }

      if (yearLevel) {
        yearLevel.value =
          student.year_level || ""

        yearLevel.disabled = true
      }

      document.getElementById(
        "studentForm"
      ).dataset.editingId =
        student.id

      document.getElementById(
        "studentModal"
      ).classList.add("show")
    })
    .catch(error => {

      console.error(error)

      alert("Failed to load student.")
    })
}

function deleteStudent(studentId) {
  let confirmed = confirm(
    "Are you sure you want to permanently delete this student?\n\n" +
    "This will also delete the student's enrollment and payment records."
  )

  if (!confirmed) {
    return
  }

  fetch(`/api/students/${studentId}`, {
    method: "DELETE"
  })
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to delete student")
      }

      return response.json()
    })
    .then(result => {
      console.log("Student deleted:", result)

      loadStudents()
      loadEnrollments()
    })
    .catch(error => {
      console.error(error)

      alert("Failed to delete student.")
    })
}

for (let navItem of navItems) {

  navItem.addEventListener("click", function() {

    let selectedPage = this.children[1].textContent

    setActiveNav(this)

    if (selectedPage == "Dashboard") {

      pageTitle.textContent = "Dashboard"
      pageDescription.textContent = "CAS Management System"

      loadDashboard()
    } 
    else if (selectedPage == "Students") {

      pageTitle.textContent = "Students"

      pageDescription.textContent =
        "CAS Student Management System"

      loadPage("students.html")
        .then(() => {

          loadStudents()

          loadEnrollmentStudents()

          loadEnrollments()

          initializeStudentsPage()

          initializeStudentSearch()

        })
        .catch(error => {

          console.error(
            "Failed to load Students page:",
            error
          )

        })
    }

    else if (selectedPage == "Fund Collection") {
      pageTitle.textContent = "Fund Collection"
      pageDescription.textContent = "CAS Fund Collection"

      loadPage("fund-collection.html")
        .then(() => {
          loadFundCollectionOverview()
          loadPayments()
          loadPaymentStudents()
          loadCollectionStatus()
          initializePaymentPage()
          initializePaymentSearch()
          initializeCollectionStatusSearch()
        })
        .catch(error => {
          console.error(
            "Failed to load Fund Collection page:",
            error
          )
        })
    }
    else if (selectedPage == "Obligations") {

      pageTitle.textContent = "Obligations"
      pageDescription.textContent =
        "CAS Obligations Management System"

      loadPage("obligations.html")
    }

    else if (selectedPage == "Events") {
      pageTitle.textContent = "Events"
      pageDescription.textContent =
        "Manage CAS events and activities."

      loadPage("events.html")
        .then(() => {
          loadEvents()
          initializeEventsPage()
          initializePreAuditModal()
        })        
        .catch(error => {
          console.error(
            "Failed to load Events page:",
            error
          )
        })
    }

    else if (selectedPage == "Reports") {

      pageTitle.textContent = "Reports"
      pageDescription.textContent =
        "CAS Reports Management System"

      loadPage("reports.html")
    }

    else if (selectedPage == "Settings") {

      pageTitle.textContent = "Settings"
      pageDescription.textContent =
        "CAS System Settings"

      loadPage("settings.html")
    }

  })
}

loadDashboard()

const logoutButton =
  document.getElementById(
    "logoutButton"
  )

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async function() {

      try {

        await fetch(
          "/api/logout",
          {
            method: "POST"
          }
        )

      } catch (error) {

        console.error(
          "Logout error:",
          error
        )

      }

      window.location.href =
        "/login.html"
    }
  )
}

function initializeStudentsPage() {

  let addButton =
    document.getElementById("addStudentButton")

  let modal =
    document.getElementById("studentModal")

  let closeButton =
    document.getElementById("closeStudentModal")

  let cancelButton =
    document.getElementById("cancelStudentButton")

  let form =
    document.getElementById("studentForm")

  let enrollButton =
    document.getElementById("enrollStudentButton")

  let enrollmentModal =
    document.getElementById("enrollmentModal")

  let closeEnrollmentButton =
    document.getElementById("closeEnrollmentModal")

  let cancelEnrollmentButton =
    document.getElementById("cancelEnrollmentButton")


  enrollButton.addEventListener(
    "click",
    function() {

      enrollmentModal.classList.add("show")

    }
  )


  closeEnrollmentButton.addEventListener(
    "click",
    function() {

      enrollmentModal.classList.remove("show")

    }
  )


  cancelEnrollmentButton.addEventListener(
    "click",
    function() {

      enrollmentModal.classList.remove("show")

      document.getElementById(
        "enrollmentForm"
      ).reset()

      document.getElementById(
        "enrollmentStudent"
      ).value = ""

      document.getElementById(
        "enrollmentStudentSearch"
      ).value = ""

      document.getElementById(
        "enrollmentStudentResults"
      ).innerHTML = ""

    }
  )


  addButton.addEventListener(
    "click",
    function() {

      form.reset()

      delete form.dataset.editingId

      document.getElementById(
        "studentModalTitle"
      ).textContent = "Add Student"

      document.getElementById(
        "studentModalDescription"
      ).textContent =
        "Enter the student's information."

      document.getElementById(
        "studentSchoolYear"
      ).disabled = false

      document.getElementById(
        "studentEnrollmentYearLevel"
      ).disabled = false

      modal.classList.add("show")

    }
  )


  closeButton.addEventListener(
    "click",
    function() {

      modal.classList.remove("show")

    }
  )


  cancelButton.addEventListener(
    "click",
    function() {

      modal.classList.remove("show")

      form.reset()

      delete form.dataset.editingId

    }
  )


  form.addEventListener(
    "submit",
    function(event) {

      event.preventDefault()

      let editingId =
        form.dataset.editingId


      let student = {

        student_number:
          document.getElementById(
            "studentNumber"
          ).value.trim(),

        first_name:
          document.getElementById(
            "firstName"
          ).value.trim(),

        last_name:
          document.getElementById(
            "lastName"
          ).value.trim(),

        program:
          document.getElementById(
            "program"
          ).value.trim()

      }


      if (!student.student_number) {

        alert(
          "Please enter the student number."
        )

        return

      }


      if (!student.first_name) {

        alert(
          "Please enter the first name."
        )

        return

      }


      if (!student.last_name) {

        alert(
          "Please enter the last name."
        )

        return

      }


      let url =
        "/api/students"

      let method =
        "POST"


      if (editingId) {

        url =
          `/api/students/${editingId}`

        method =
          "PUT"

      }


      fetch(
        url,
        {

          method: method,

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(student)

        }
      )
        .then(
          response => {

            return response.json()
              .then(
                data => ({

                  ok:
                    response.ok,

                  data:
                    data

                })
              )

          }
        )
        .then(
          async result => {

            if (!result.ok) {

              throw new Error(
                result.data.error ||
                "Failed to save student."
              )

            }


            let savedStudent =
              result.data


            if (!editingId) {

              let enrollment = {

                studentId:
                  savedStudent.id,

                schoolYear:
                  document.getElementById(
                    "studentSchoolYear"
                  ).value,

                yearLevel:
                  document.getElementById(
                    "studentEnrollmentYearLevel"
                  ).value

              }


              if (
                !enrollment.schoolYear ||
                !enrollment.yearLevel
              ) {

                throw new Error(
                  "Enrollment information is incomplete."
                )

              }


              let enrollmentResponse =
                await fetch(
                  "/api/enrollments",
                  {

                    method: "POST",

                    headers: {
                      "Content-Type":
                        "application/json"
                    },

                    body:
                      JSON.stringify(
                        enrollment
                      )

                  }
                )


              let enrollmentData =
                await enrollmentResponse.json()


              if (!enrollmentResponse.ok) {

                throw new Error(
                  enrollmentData.error ||
                  "Failed to create enrollment."
                )

              }

            }


            modal.classList.remove(
              "show"
            )

            form.reset()

            delete form.dataset.editingId


            document.getElementById(
              "studentModalTitle"
            ).textContent =
              "Add Student"


            document.getElementById(
              "studentModalDescription"
            ).textContent =
              "Enter the student's information."


            showSuccessToast(
              editingId
                ? "Student Updated Successfully"
                : "Student Added & Enrolled Successfully",

              editingId
                ? "The student's information has been updated."
                : "The student has been added and enrolled successfully."
            )


            loadStudents()

            loadEnrollmentStudents()

            loadEnrollments()

            loadCollectionStatus()

          }
        )
        .catch(
          error => {

            console.error(
              "Student save error:",
              error
            )

            alert(
              error.message
            )

          }
        )

    }
  )

}

pageContent.addEventListener("submit", function(event) {

  if (!event.target.matches("#enrollmentForm")) {
    return
  }

  event.preventDefault()

  let form = event.target

  let studentId =
    document.getElementById(
      "enrollmentStudent"
    ).value

  let schoolYear =
    document.getElementById(
      "enrollmentSchoolYear"
    ).value

  let yearLevel =
    document.getElementById(
      "enrollmentYearLevel"
    ).value

  if (!studentId) {
    alert("Please select a student.")
    return
  }

  if (!schoolYear) {
    alert("Please select a school year.")
    return
  }

  if (!yearLevel) {
    alert("Please select a year level.")
    return
  }

  fetch("/api/enrollments", {
    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      studentId: studentId,
      schoolYear: schoolYear,
      yearLevel: yearLevel
    })
  })
    .then(response => {
      return response.json()
        .then(data => ({
          ok: response.ok,
          data: data
        }))
    })
    .then(result => {

      if (!result.ok) {
        throw new Error(
          result.data.error ||
          "Failed to create enrollment."
        )
      }

    alert("Student enrolled successfully.")

    enrollmentForm.reset()

    document.getElementById(
      "enrollmentStudent"
    ).value = ""

    document.getElementById(
      "enrollmentStudentSearch"
    ).value = ""

    document.getElementById(
      "enrollmentStudentResults"
    ).innerHTML = ""

    enrollmentModal.classList.remove("show")

    loadEnrollments()

    loadStudents()

    })
    .catch(error => {

      console.error(
        "Enrollment error:",
        error
      )

      alert(error.message)
    })
})

function loadEnrollmentStudents() {
  fetch("/api/students")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load students")
      }

      return response.json()
    })
    .then(students => {
      let searchInput =
        document.getElementById(
          "enrollmentStudentSearch"
        )

      let hiddenInput =
        document.getElementById(
          "enrollmentStudent"
        )

      let results =
        document.getElementById(
          "enrollmentStudentResults"
        )

        if (!searchInput) {
          return
        }
        
      searchInput.addEventListener(
        "input",
        function() {
          let searchTerm =
            this.value.toLowerCase().trim()

          hiddenInput.value = ""

          results.innerHTML = ""

          if (!searchTerm) {
            results.classList.remove("show")
            return
          }

          let matches = students.filter(student => {
            let studentNumber =
              student.student_number.toLowerCase()

            let name =
              `${student.first_name} ${student.last_name}`
                .toLowerCase()

            return (
              studentNumber.includes(searchTerm) ||
              name.includes(searchTerm)
            )
          })

          if (matches.length === 0) {
            results.innerHTML = `
              <div class="student-selector-empty">
                No students found.
              </div>
            `

            results.classList.add("show")

            return
          }

          for (let student of matches) {
            let option =
              document.createElement("div")

            option.className =
              "student-selector-option"

            option.textContent =
              `${student.student_number} - ` +
              `${student.first_name} ${student.last_name}`

            option.dataset.id = student.id

            option.addEventListener(
              "click",
              function() {
                searchInput.value =
                  option.textContent

                hiddenInput.value =
                  option.dataset.id

                results.innerHTML = ""

                results.classList.remove("show")
              }
            )

            results.appendChild(option)
          }

          results.classList.add("show")
        }
      )

      document.addEventListener(
        "click",
        function(event) {
          if (
            !event.target.closest(
              ".student-selector"
            )
          ) {
            results.classList.remove("show")
          }
        }
      )
    })
    .catch(error => {
      console.error(error)
    })
}

function loadEnrollments() {
  fetch("/api/enrollments")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load enrollments")
      }

      return response.json()
    })
    .then(enrollments => {

      let tableBody =
        document.getElementById(
          "enrollmentsTableBody"
        )

        if (!tableBody) {
          return
        }
        
      tableBody.innerHTML = ""

      if (enrollments.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6">
              No enrollment records found.
            </td>
          </tr>
        `

        return
      }

      for (let enrollment of enrollments) {

        let row =
          document.createElement("tr")

        let yearLevel =
          enrollment.year_level

        let yearText = "-"

        if (yearLevel == 1) {
          yearText = "1st Year"
        } else if (yearLevel == 2) {
          yearText = "2nd Year"
        } else if (yearLevel == 3) {
          yearText = "3rd Year"
        } else if (yearLevel == 4) {
          yearText = "4th Year"
        }

        row.innerHTML = `
          <td>
            ${enrollment.student_number}
          </td>

          <td>
            ${enrollment.first_name}
            ${enrollment.last_name}
          </td>

          <td>
            ${enrollment.school_year}
          </td>

          <td>
            ${yearText}
          </td>

          <td>
            ${enrollment.status}
          </td>

          <td>
            <button
              class="secondary-button delete-enrollment-button"
              data-id="${enrollment.id}"
            >
              Delete
            </button>
          </td>
        `

        tableBody.appendChild(row)
      }
      let deleteButtons = document.querySelectorAll(
        ".delete-enrollment-button"
      )

      for (let button of deleteButtons) {
        button.addEventListener("click", function() {
          let enrollmentId = this.dataset.id

          deleteEnrollment(enrollmentId)
        })
      }
    })

    
    .catch(error => {

      console.error(error)

      let tableBody =
        document.getElementById(
          "enrollmentsTableBody"
        )

      tableBody.innerHTML = `
        <tr>
          <td colspan="6">
            Failed to load enrollments.
          </td>
        </tr>
      `
    })
}

function deleteEnrollment(enrollmentId) {
  let confirmed = confirm(
    "Are you sure you want to remove this enrollment?"
  )

  if (!confirmed) {
    return
  }

  fetch(`/api/enrollments/${enrollmentId}`, {
    method: "DELETE"
  })
    .then(response => {
      return response.json()
        .then(data => ({
          ok: response.ok,
          data: data
        }))
    })
    .then(result => {
      if (!result.ok) {
        throw new Error(result.data.error)
      }

      alert("Enrollment removed successfully.")

      loadEnrollments()
      loadStudents()
      loadCollectionStatus()    
    })
    .catch(error => {
      console.error(error)

      alert(
        "Failed to remove enrollment: " +
        error.message
      )
    })
}

function loadFundCollectionOverview() {
  if (
    !document.getElementById(
      "expectedCollection"
    )
  ) {
    return
  }
  fetch(
    `/api/fund-collection?schoolYear=${
      encodeURIComponent(
        localStorage.getItem(
          "activeSchoolYear"
        ) || "2026-2027"
      )
    }`
  )
    .then(response => {
      if (!response.ok) {
        throw new Error(
          "Failed to load fund collection"
        )
      }

      return response.json()
    })
    .then(data => {
      document.getElementById(
        "expectedCollection"
      ).textContent =
        `₱${Number(
          data.expectedCollection
        ).toLocaleString("en-PH", {
          minimumFractionDigits: 2
        })}`

      document.getElementById(
        "totalCollected"
      ).textContent =
        `₱${Number(
          data.totalCollected
        ).toLocaleString("en-PH", {
          minimumFractionDigits: 2
        })}`

      document.getElementById(
        "remainingCollection"
      ).textContent =
        `₱${Number(
          data.remainingCollection
        ).toLocaleString("en-PH", {
          minimumFractionDigits: 2
        })}`

      let rate = Math.min(
        Number(data.collectionRate),
        100
      )

      document.getElementById(
        "collectionRate"
      ).textContent =
        `${rate.toFixed(1)}%`

      document.getElementById(
        "collectionProgressBar"
      ).style.width =
        `${rate}%`
    })
    .catch(error => {
      console.error(error)
    })
}

function loadPayments() {
  fetch(
    `/api/payments?schoolYear=${
      encodeURIComponent(
        localStorage.getItem(
          "activeSchoolYear"
        ) || "2026-2027"
      )
    }`
  )
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load payments")
      }

      return response.json()
    })
    .then(payments => {
      let tableBody =
        document.getElementById("paymentsTableBody")

      tableBody.innerHTML = ""

      if (payments.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7">
              No payment records found.
            </td>
          </tr>
        `

        return
      }

      for (let payment of payments) {
        let paymentDate = "-"

        if (payment.payment_date) {
          paymentDate =
            new Date(
              payment.payment_date
            ).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
        }

        let row = document.createElement("tr")

        row.innerHTML = `
          <td>
            ${payment.student_number}
          </td>

          <td>
            ${payment.first_name}
            ${payment.last_name}
          </td>

          <td>
            ${payment.school_year}
          </td>

          <td>
            Term ${payment.term}
          </td>

          <td>
            ₱${Number(payment.amount).toLocaleString(
              "en-PH",
              {
                minimumFractionDigits: 2
              }
            )}
          </td>

          <td>
            ${paymentDate}
          </td>

          <td>
            <button
              class="secondary-button delete-payment-button"
              data-id="${payment.id}"
            >
              Delete
            </button>
          </td>
        `

        tableBody.appendChild(row)
      }

      let deleteButtons =
        document.querySelectorAll(
          ".delete-payment-button"
        )

      for (let button of deleteButtons) {
        button.addEventListener(
          "click",
          function() {
            let paymentId =
              this.dataset.id

            deletePayment(paymentId)
          }
        )
      }
    })
    .catch(error => {
      console.error(error)

      let tableBody =
        document.getElementById(
          "paymentsTableBody"
        )

      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Failed to load payment records.
          </td>
        </tr>
      `
    })
}

function deletePayment(paymentId) {
  let confirmed = confirm(
    "Are you sure you want to delete this payment record?"
  )

  if (!confirmed) {
    return
  }

  fetch(`/api/payments/${paymentId}`, {
    method: "DELETE"
  })
    .then(response => {
      return response.json()
        .then(data => ({
          ok: response.ok,
          data: data
        }))
    })
    .then(result => {
      if (!result.ok) {
        throw new Error(result.data.error)
      }

      alert("Payment deleted successfully.")

      loadPayments()
      loadFundCollectionOverview()
    })
    .catch(error => {
      console.error(error)

      alert(
        "Failed to delete payment: " +
        error.message
      )
    })
}

function initializePaymentPage() {
  let modal =
    document.getElementById("paymentModal")

  let openButton =
    document.getElementById("recordPaymentButton")

  let closeButton =
    document.getElementById("closePaymentModal")

  let cancelButton =
    document.getElementById("cancelPaymentButton")

  let form =
    document.getElementById("paymentForm")

  let schoolYear =
    document.getElementById("paymentSchoolYear")

  let modeOfPayment =
    document.getElementById("paymentModeOfPayment")

  let studentInput =
    document.getElementById("paymentStudent")

  let studentSearch =
    document.getElementById("paymentStudentSearch")

  let studentResults =
    document.getElementById("paymentStudentResults")

  let paymentTotal =
    document.getElementById("paymentTotal")


  /*
    OPEN PAYMENT MODAL
  */

  openButton.addEventListener(
    "click",
    function() {

      form.reset()

      studentInput.value = ""

      studentInput.dataset.studentNumber = ""

      studentSearch.value = ""

      studentResults.innerHTML = ""

      studentResults.classList.remove("show")

      paymentTotal.textContent =
        "₱0.00"

      /*
        Reset terms
      */

      let checkboxes =
        document.querySelectorAll(
          'input[name="paymentTerms"]'
        )

      for (let checkbox of checkboxes) {

        checkbox.disabled = false
        checkbox.checked = false

        let option =
          checkbox.closest(
            ".payment-term-option"
          )

        if (!option) {
          continue
        }

        let label =
          option.querySelector("span")

        let amount =
          option.querySelector("strong")

        if (label) {
          label.textContent =
            `Term ${checkbox.value}`
        }

        if (amount) {
          amount.textContent =
            "₱50.00"
        }

        option.classList.remove("paid")
      }

      modal.classList.add("show")
    }
  )


  /*
    CLOSE BUTTON
  */

  closeButton.addEventListener(
    "click",
    function() {

      modal.classList.remove("show")
    }
  )


  /*
    CANCEL BUTTON
  */

  cancelButton.addEventListener(
    "click",
    function() {

      modal.classList.remove("show")

      form.reset()

      studentInput.value = ""

      studentInput.dataset.studentNumber = ""

      studentSearch.value = ""

      studentResults.innerHTML = ""

      studentResults.classList.remove("show")

      paymentTotal.textContent =
        "₱0.00"
    }
  )


  /*
    SCHOOL YEAR CHANGE
  */

  schoolYear.addEventListener(
    "change",
    function() {

      updatePaidPaymentTerms()
    }
  )


  /*
    SUBMIT PAYMENT
  */

  form.addEventListener(
    "submit",
    function(event) {

      event.preventDefault()

      let studentId =
        studentInput.value

      let selectedSchoolYear =
        schoolYear.value

      let selectedModeOfPayment =
        modeOfPayment.value

      let selectedTerms =
        document.querySelectorAll(
          'input[name="paymentTerms"]:checked:not(:disabled)'
        )

      let terms = []

      for (let checkbox of selectedTerms) {

        terms.push(
          Number(checkbox.value)
        )
      }


      /*
        VALIDATION
      */

      if (!studentId) {

        alert(
          "Please select a student."
        )

        return
      }


      if (!selectedSchoolYear) {

        alert(
          "Please select a school year."
        )

        return
      }


      if (!selectedModeOfPayment) {

        alert(
          "Please select a mode of payment."
        )

        return
      }


      if (terms.length === 0) {

        alert(
          "Please select at least one unpaid term."
        )

        return
      }


      /*
        SEND PAYMENT TO SERVER
      */

      fetch("/api/payments", {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({

          studentId:
            studentId,

          schoolYear:
            selectedSchoolYear,

          modeOfPayment:
            selectedModeOfPayment,

          terms:
            terms
        })
      })

        .then(response => {

          return response.json()
            .then(data => ({
              ok: response.ok,
              data: data
            }))
        })

        .then(result => {

          if (!result.ok) {

            throw new Error(
              result.data.error ||
              "Failed to record payment."
            )
          }


          /*
            SUCCESS MESSAGE
          */

          alert(
            `Payment recorded successfully.\n\n` +
            `Terms: ${terms.join(", ")}\n` +
            `Mode of Payment: ${selectedModeOfPayment}\n` +
            `Total: ₱${(
              terms.length * 50
            ).toFixed(2)}`
          )


          /*
            CLOSE MODAL
          */

          modal.classList.remove("show")

          form.reset()

          studentInput.value = ""

          studentInput.dataset.studentNumber = ""

          studentSearch.value = ""

          studentResults.innerHTML = ""

          studentResults.classList.remove("show")

          paymentTotal.textContent =
            "₱0.00"


          /*
            REFRESH DATA
          */

          loadPayments()

          loadFundCollectionOverview()

          loadCollectionStatus()
        })

        .catch(error => {

          console.error(
            "Payment error:",
            error
          )

          alert(
            "Failed to record payment: " +
            error.message
          )
        })
    }
  )


  /*
    TERM CHECKBOXES
  */

  let termCheckboxes =
    document.querySelectorAll(
      'input[name="paymentTerms"]'
    )

  for (let checkbox of termCheckboxes) {

    checkbox.addEventListener(
      "change",
      function() {

        let selected =
          document.querySelectorAll(
            'input[name="paymentTerms"]:checked:not(:disabled)'
          )

        let total =
          selected.length * 50

        paymentTotal.textContent =
          `₱${total.toFixed(2)}`
      }
    )
  }
}

function updatePaidPaymentTerms() {
  let studentInput =
    document.getElementById("paymentStudent")

  let schoolYearInput =
    document.getElementById("paymentSchoolYear")

  let studentId =
    studentInput.value

  let schoolYear =
    schoolYearInput.value

  let checkboxes =
    document.querySelectorAll(
      'input[name="paymentTerms"]'
    )

  /*
    Reset all terms first
  */

  for (let checkbox of checkboxes) {

    checkbox.disabled = false
    checkbox.checked = false

    let option =
      checkbox.closest(
        ".payment-term-option"
      )

    if (!option) {
      continue
    }

    let label =
      option.querySelector("span")

    let amount =
      option.querySelector("strong")

    if (label) {
      label.textContent =
        `Term ${checkbox.value}`
    }

    if (amount) {
      amount.textContent =
        "₱50.00"
    }

    option.classList.remove("paid")
  }

  /*
    Reset total
  */

  let total =
    document.getElementById(
      "paymentTotal"
    )

  if (total) {
    total.textContent = "₱0.00"
  }

  /*
    Nothing selected yet
  */

  if (!studentId || !schoolYear) {
    return
  }

  /*
    Get all payment records
  */

  fetch("/api/payments")
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load payment records."
        )
      }

      return response.json()
    })

    .then(payments => {

      /*
        Find payments belonging to the
        selected student and school year.

        The backend may return student_id
        OR student_number, so we support both.
      */

      let paidTerms = []

      for (let payment of payments) {

        let sameStudent = false
        let sameSchoolYear = false

        /*
          Check student ID if available
        */

        if (
          payment.student_id !== undefined &&
          payment.student_id !== null
        ) {

          sameStudent =
            String(payment.student_id) ===
            String(studentId)
        }

        /*
          If student_id isn't available,
          use the selected student's
          student number stored in dataset.
        */

        if (!sameStudent) {

          let selectedStudentNumber =
            studentInput.dataset.studentNumber

          if (
            selectedStudentNumber &&
            payment.student_number
          ) {

            sameStudent =
              String(
                payment.student_number
              ).trim() ===
              String(
                selectedStudentNumber
              ).trim()
          }
        }

        /*
          Check school year
        */

        sameSchoolYear =
          String(
            payment.school_year
          ).trim() ===
          String(
            schoolYear
          ).trim()

        /*
          Add paid term
        */

        if (
          sameStudent &&
          sameSchoolYear
        ) {

          let term =
            Number(payment.term)

          if (!paidTerms.includes(term)) {
            paidTerms.push(term)
          }
        }
      }

      console.log(
        "Selected student ID:",
        studentId
      )

      console.log(
        "Selected school year:",
        schoolYear
      )

      console.log(
        "Paid terms:",
        paidTerms
      )

      /*
        Disable paid terms
      */

      for (let checkbox of checkboxes) {

        let term =
          Number(checkbox.value)

        if (
          paidTerms.includes(term)
        ) {

          checkbox.disabled = true
          checkbox.checked = false

          let option =
            checkbox.closest(
              ".payment-term-option"
            )

          if (!option) {
            continue
          }

          let label =
            option.querySelector("span")

          let amount =
            option.querySelector("strong")

          if (label) {
            label.textContent =
              `Term ${term} — Paid`
          }

          if (amount) {
            amount.textContent =
              "Paid"
          }

          option.classList.add("paid")
        }
      }

      /*
        Recalculate total using only
        selectable terms.
      */

      let selected =
        document.querySelectorAll(
          'input[name="paymentTerms"]:checked:not(:disabled)'
        )

      let newTotal =
        selected.length * 50

      if (total) {
        total.textContent =
          `₱${newTotal.toFixed(2)}`
      }
    })

    .catch(error => {

      console.error(
        "Failed to check paid terms:",
        error
      )
    })
}



function loadPaymentStudents() {
  fetch("/api/students")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load students")
      }

      return response.json()
    })
    .then(students => {
      let searchInput =
        document.getElementById(
          "paymentStudentSearch"
        )

      let hiddenInput =
        document.getElementById(
          "paymentStudent"
        )

      let results =
        document.getElementById(
          "paymentStudentResults"
        )

      searchInput.addEventListener(
        "input",
        function() {
          let searchTerm =
            this.value.toLowerCase().trim()

          hiddenInput.value = ""

          results.innerHTML = ""

          if (!searchTerm) {
            results.classList.remove("show")
            return
          }

          let matches =
            students.filter(student => {
              let number =
                student.student_number
                  .toLowerCase()

              let name =
                `${student.first_name} ${student.last_name}`
                  .toLowerCase()

              return (
                number.includes(searchTerm) ||
                name.includes(searchTerm)
              )
            })

          if (matches.length === 0) {
            results.innerHTML = `
              <div class="student-selector-empty">
                No students found.
              </div>
            `

            results.classList.add("show")

            return
          }

          for (let student of matches) {
            let option =
              document.createElement("div")

            option.className =
              "student-selector-option"

            option.textContent =
              `${student.student_number} - ` +
              `${student.first_name} ${student.last_name}`

            option.addEventListener(
              "click",
              function() {

                searchInput.value =
                  option.textContent

                hiddenInput.value =
                  student.id

                hiddenInput.dataset.studentNumber =
                  student.student_number

                results.innerHTML = ""

                results.classList.remove("show")

                updatePaidPaymentTerms()
              }
            )
            results.appendChild(option)
          }

          results.classList.add("show")
        }
      )

      document.addEventListener(
        "click",
        function(event) {
          if (
            !event.target.closest(
              ".student-selector"
            )
          ) {
            results.classList.remove("show")
          }
        }
      )
    })
    .catch(error => {
      console.error(error)
    })
}

function loadCollectionStatus() {

  let tableBody =
    document.getElementById(
      "collectionStatusTableBody"
    )

  if (!tableBody) {
    return
  }

  fetch(
    `/api/collection-status?schoolYear=${
      encodeURIComponent(
        localStorage.getItem(
          "activeSchoolYear"
        ) || "2026-2027"
      )
    }`
  )
    .then(response => {

      if (!response.ok) {
        throw new Error(
          "Failed to load collection status"
        )
      }

      return response.json()
    })
    .then(records => {

      tableBody.innerHTML = ""

      if (records.length === 0) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="7">
              No collection records found.
            </td>
          </tr>
        `

        return
      }

      for (let record of records) {

        let row =
          document.createElement("tr")

        row.innerHTML = `
          <td>
            ${record.studentNumber}
          </td>

          <td>
            ${record.firstName}
            ${record.lastName}
          </td>

          <td>
            ${record.schoolYear}
          </td>

          <td>
            ₱${Number(
              record.expectedAmount
            ).toLocaleString("en-PH", {
              minimumFractionDigits: 2
            })}
          </td>

          <td>
            ₱${Number(
              record.totalPaid
            ).toLocaleString("en-PH", {
              minimumFractionDigits: 2
            })}
          </td>

          <td>
            ₱${Number(
              record.remaining
            ).toLocaleString("en-PH", {
              minimumFractionDigits: 2
            })}
          </td>

          <td>
            ${record.status}
          </td>
        `

        tableBody.appendChild(row)
      }
    })
    .catch(error => {

      console.error(error)

      tableBody.innerHTML = `
        <tr>
          <td colspan="7">
            Failed to load collection status.
          </td>
        </tr>
      `
    })
}

function initializeCollectionStatusSearch() {
  let searchInput =
    document.getElementById("collectionStatusSearch")

  let tableBody =
    document.getElementById("collectionStatusTableBody")

  if (!searchInput || !tableBody) {
    console.error(
      "Collection Status search elements not found."
    )

    return
  }

  searchInput.addEventListener(
    "input",
    function() {
      let searchTerm =
        this.value.toLowerCase().trim()

      let rows =
        tableBody.querySelectorAll("tr")

      for (let row of rows) {
        let rowText =
          row.textContent.toLowerCase()

        if (
          searchTerm === "" ||
          rowText.includes(searchTerm)
        ) {
          row.style.display = ""
        } else {
          row.style.display = "none"
        }
      }
    }
  )
}

function initializePaymentSearch() {
  let searchInput =
    document.getElementById("paymentSearch")

  let tableBody =
    document.getElementById("paymentsTableBody")

  if (!searchInput || !tableBody) {
    console.error(
      "Payment search elements not found."
    )

    return
  }

  searchInput.oninput = function() {
    let searchTerm =
      searchInput.value.toLowerCase().trim()

    let rows =
      tableBody.querySelectorAll("tr")

    for (let row of rows) {
      let rowText =
        row.textContent.toLowerCase()

      row.style.display =
        rowText.includes(searchTerm)
          ? ""
          : "none"
    }
  }
}

function showSuccessToast(title, message) {
  let toast =
    document.getElementById("successToast")

  let toastTitle =
    document.getElementById("successToastTitle")

  let toastMessage =
    document.getElementById("successToastMessage")

  toastTitle.textContent = title
  toastMessage.textContent = message

  toast.classList.add("show")

  setTimeout(function() {
    toast.classList.remove("show")
  }, 3000)
}

document.addEventListener(
  "change",
  function(event) {

    if (
      event.target.id !==
      "activeSchoolYear"
    ) {
      return
    }

    localStorage.setItem(
      "activeSchoolYear",
      event.target.value
    )

    loadFundCollectionOverview()

    if (
      document.getElementById(
        "paymentsTableBody"
      )
    ) {
      loadPayments()
    }

    if (
      document.getElementById(
        "collectionStatusTableBody"
      )
    ) {
      loadCollectionStatus()
    }
  }
)