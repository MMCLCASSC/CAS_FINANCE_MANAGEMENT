const http = require("http")
require("dotenv").config()
const fs = require("fs")
const path = require("path")
const { Pool } = require("pg")

const crypto = require("crypto")

const sessions = new Map()

const db = new Pool({
  connectionString:
    process.env.DATABASE_URL
})

const server = http.createServer(async (req, res) => {

  
  // =========================================================
  // AUTHENTICATION CHECK
  // =========================================================

  const cookieHeader =
    req.headers.cookie || ""

  const sessionMatch =
    cookieHeader.match(
      /(?:^|;\s*)session=([^;]+)/
    )

  const sessionId =
    sessionMatch
      ? sessionMatch[1]
      : null

  const session =
    sessionId
      ? sessions.get(sessionId)
      : null

  const publicPaths = [
    "/login.html",
    "/style.css",
    "/login.js"
  ]

  const isPublicPath =
    publicPaths.includes(
      new URL(
        req.url,
        `http://${req.headers.host}`
      ).pathname
    )

  const isLoginApi =
    req.method === "POST" &&
    req.url === "/api/login"

  const isLogoutApi =
    req.method === "POST" &&
    req.url === "/api/logout"

  if (
    !session &&
    !isPublicPath &&
    !isLoginApi &&
    !isLogoutApi
  ) {

    if (
      req.url.startsWith("/api/")
    ) {

      res.writeHead(401, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            "Authentication required."
        })
      )

    } else {

      res.writeHead(302, {
        "Location":
          "/login.html"
      })

      res.end()

    }

    return
  }
  // =========================================================
  // LOGIN
  // =========================================================

  if (
    req.method === "POST" &&
    req.url === "/api/login"
  ) {

    let body = ""

    req.on("data", chunk => {
      body += chunk
    })

    req.on("end", async () => {

      try {

        const data =
          JSON.parse(body || "{}")

        const username =
          String(
            data.username || ""
          ).trim()

        const password =
          String(
            data.password || ""
          )

        if (!username || !password) {

          res.writeHead(400, {
            "Content-Type":
              "application/json"
          })

          res.end(
            JSON.stringify({
              error:
                "Username and password are required."
            })
          )

          return
        }

        const result =
          await db.query(
            `
            SELECT
              id,
              username,
              role
            FROM users
            WHERE username = $1
            AND password_hash =
              crypt($2, password_hash)
            `,
            [
              username,
              password
            ]
          )

        if (
          result.rows.length === 0
        ) {

          res.writeHead(401, {
            "Content-Type":
              "application/json"
          })

          res.end(
            JSON.stringify({
              error:
                "Invalid username or password."
            })
          )

          return
        }

        const user =
          result.rows[0]

        const sessionId =
          crypto.randomBytes(32).toString("hex")

        sessions.set(
          sessionId,
          {
            userId:
              user.id,

            username:
              user.username,

            role:
              user.role
          }
        )

        res.writeHead(200, {
          "Content-Type":
            "application/json",

          "Set-Cookie":
            `session=${sessionId}; HttpOnly; Path=/; SameSite=Strict`
        })

        res.end(
          JSON.stringify({
            success: true,

            user: {
              id:
                user.id,

              username:
                user.username,

              role:
                user.role
            }
          })
        )

      } catch (error) {

        console.error(
          "Login error:",
          error
        )

        res.writeHead(500, {
          "Content-Type":
            "application/json"
        })

        res.end(
          JSON.stringify({
            error:
              "Login failed."
          })
        )
      }
    })

    return
  }

    // =========================================================
  // LOGOUT
  // =========================================================

  if (
    req.method === "POST" &&
    req.url === "/api/logout"
  ) {

    const cookieHeader =
      req.headers.cookie || ""

    const sessionMatch =
      cookieHeader.match(
        /(?:^|;\s*)session=([^;]+)/
      )

    if (sessionMatch) {

      sessions.delete(
        sessionMatch[1]
      )
    }

    res.writeHead(200, {
      "Content-Type":
        "application/json",

      "Set-Cookie":
        "session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict"
    })

    res.end(
      JSON.stringify({
        success: true
      })
    )

    return
  }

  // =========================================================
  // GET STUDENTS
  // =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/events"
) {

  try {

    const eventsResult =
      await db.query(
        `
        SELECT
          id,
          event_name,
          event_date,
          location,
          description,
          status,
          approved_allocation,
          created_at
        FROM events
        ORDER BY
          event_date ASC,
          id ASC
        `
      )

    const allocationResult =
      await db.query(
        `
        SELECT
          COALESCE(
            SUM(amount),
            0
          ) AS allocated_fund
        FROM event_expected_income
        `
      )

    const fundResult =
      await db.query(
        `
        SELECT
          COALESCE(
            SUM(amount),
            0
          ) AS available_fund
        FROM payments
        `
      )

    const availableFund =
      Number(
        fundResult.rows[0].available_fund
      )

    const allocatedFund =
      Number(
        allocationResult.rows[0].allocated_fund
      )

    const remainingFund =
      availableFund -
      allocatedFund

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        events:
          eventsResult.rows,

        availableFund:
          availableFund,

        allocatedFund:
          allocatedFund,

        remainingFund:
          remainingFund
      })
    )

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load events."
      })
    )

  }

  return
}

// =========================================================
// GET ALL STUDENTS
// =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/students"
) {

  try {

    const result =
      await db.query(`
        SELECT
          id,
          student_number,
          first_name,
          last_name,
          program,
          status,
          created_at
        FROM students
        ORDER BY
          last_name ASC,
          first_name ASC
      `)

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify(
        result.rows
      )
    )

  } catch (error) {

    console.error(
      "Get students error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load students"
      })
    )
  }

  return
}

// =========================================================
// POST STUDENT
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/students"
) {

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data = JSON.parse(body)

      const result =
        await db.query(
          `
            INSERT INTO students (
              student_number,
              first_name,
              last_name,
              program,
              status
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
          `,
          [
            data.student_number,
            data.first_name,
            data.last_name,
            data.program,
            data.status || "Active"
          ]
        )

      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(
        "Create student error:",
        error
      )

      res.writeHead(500, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            "Failed to save student"
        })
      )
    }
  })


  return
}

// =========================================================
// GET ONE STUDENT
// =========================================================

if (
  req.method === "GET" &&
  req.url.startsWith("/api/students/")
) {

  const studentId =
    req.url.split("/")[3]

  try {

    const result = await db.query(`
      SELECT
        students.id,
        students.student_number,
        students.first_name,
        students.last_name,
        students.program,
        students.status,
        enrollments.school_year,
        enrollments.year_level
      FROM students

      LEFT JOIN enrollments
        ON enrollments.id = (
          SELECT e.id
          FROM enrollments e
          WHERE e.student_id = students.id
          ORDER BY e.school_year DESC
          LIMIT 1
        )

      WHERE students.id = $1

    `, [studentId])

    if (result.rows.length === 0) {

      res.writeHead(404, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Student not found"
      }))

      return
    }

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(
      JSON.stringify(result.rows[0])
    )

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to load student"
    }))
  }

  return
}

// =========================================================
// UPDATE STUDENT
// =========================================================

if (
  req.method === "PUT" &&
  req.url.startsWith("/api/students/")
) {

  const studentId =
    req.url.split("/")[3]

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const student =
        JSON.parse(body)

      const result =
        await db.query(`
          UPDATE students
          SET
            student_number = $1,
            first_name = $2,
            last_name = $3,
            program = $4
          WHERE id = $5
          RETURNING *
        `, [
          student.studentNumber,
          student.firstName,
          student.lastName,
          student.program,
          studentId
        ])

      if (result.rows.length === 0) {

        res.writeHead(404, {
          "Content-Type":
            "application/json"
        })

        res.end(JSON.stringify({
          error: "Student not found"
        }))

        return
      }

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(500, {
        "Content-Type":
          "application/json"
      })

      res.end(JSON.stringify({
        error:
          "Failed to update student"
      }))
    }

  })

  return
}

  
// DELETE ONE STUDENT

if (req.method === "DELETE" && req.url.startsWith("/api/students/")) {
  try {
    const studentId = req.url.split("/")[3]

    if (!studentId) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Student ID is required"
      }))

      return
    }

    const result = await db.query(
      `
      DELETE FROM students
      WHERE id = $1
      RETURNING id
      `,
      [studentId]
    )

    if (result.rows.length === 0) {
      res.writeHead(404, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Student not found"
      }))

      return
    }

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      message: "Student deleted successfully",
      id: result.rows[0].id
    }))

  } catch (error) {
    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to delete student"
    }))
  }

  return
}



  // =========================================================
  // ADD STUDENT
  // =========================================================

  

// =========================================================
// RECORD PAYMENT
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/payments"
) {
  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {
    const client = await db.connect()

    try {
      const data = JSON.parse(body)

      const studentId =
        data.studentId

      const schoolYear =
        data.schoolYear

      const modeOfPayment =
        data.modeOfPayment

      const terms =
        data.terms

      if (!studentId) {
        throw new Error(
          "Student is required."
        )
      }

      if (!schoolYear) {
        throw new Error(
          "School year is required."
        )
      }

      if (!modeOfPayment) {
        throw new Error(
          "Mode of payment is required."
        )
      }

      if (
        !Array.isArray(terms) ||
        terms.length === 0
      ) {
        throw new Error(
          "Please select at least one term."
        )
      }

      const allowedModes = [
        "Cash",
        "GCash",
        "Bank Transfer",
        "Other"
      ]

      if (
        !allowedModes.includes(
          modeOfPayment
        )
      ) {
        throw new Error(
          "Invalid mode of payment."
        )
      }

      await client.query("BEGIN")

      for (let term of terms) {

        await client.query(
          `
          INSERT INTO payments (
            student_id,
            school_year,
            term,
            amount,
            mode_of_payment
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            studentId,
            schoolYear,
            term,
            50,
            modeOfPayment
          ]
        )
      }

      await client.query("COMMIT")

      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          message:
            "Payment recorded successfully.",

          terms:
            terms,

          modeOfPayment:
            modeOfPayment,

          totalAmount:
            terms.length * 50
        })
      )

    } catch (error) {

      await client.query(
        "ROLLBACK"
      )

      console.error(error)

      if (
        error.code === "23505"
      ) {
        res.writeHead(409, {
          "Content-Type":
            "application/json"
        })

        res.end(
          JSON.stringify({
            error:
              "One or more selected terms have already been paid for this school year."
          })
        )

        return
      }

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to record payment"
        })
      )

    } finally {

      client.release()
    }
  })

  return
}


// =========================================================
// GET ALL ENROLLMENTS
// =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/enrollments"
) {

  try {

    const result =
      await db.query(`
        SELECT
          enrollments.id,
          enrollments.student_id,
          enrollments.school_year,
          enrollments.year_level,
          enrollments.status,
          students.student_number,
          students.first_name,
          students.last_name,
          students.program
        FROM enrollments

        JOIN students
          ON enrollments.student_id =
             students.id

        ORDER BY
          enrollments.school_year DESC,
          students.last_name ASC,
          students.first_name ASC
      `)

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify(
        result.rows
      )
    )

  } catch (error) {

    console.error(
      "Get enrollments error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load enrollments"
      })
    )
  }

  return
}

// =========================================================
// DELETE ENROLLMENT
// =========================================================

if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/enrollments/")
) {

  const enrollmentId =
    req.url.split("/")[3]

  try {

    if (!enrollmentId) {

      res.writeHead(400, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Enrollment ID is required"
      }))

      return
    }

    const result = await db.query(`
      DELETE FROM enrollments
      WHERE id = $1
      RETURNING id
    `, [enrollmentId])

    if (result.rows.length === 0) {

      res.writeHead(404, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Enrollment not found"
      }))

      return
    }

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      message: "Enrollment deleted successfully",
      id: result.rows[0].id
    }))

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to delete enrollment"
    }))
  }

  return
}


if (
  req.method === "POST" &&
  req.url === "/api/enrollments"
) {
  
  
  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {
    try {
      const data = JSON.parse(body)

      const result = await db.query(
        `
        INSERT INTO enrollments (
          student_id,
          school_year,
          year_level
        )
        VALUES ($1, $2, $3)
        RETURNING *
        `,
        [
          data.studentId,
          data.schoolYear,
          data.yearLevel
        ]
      )

      res.writeHead(201, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify(result.rows[0]))

    } catch (error) {
      console.error(error)

      if (error.code === "23505") {
        res.writeHead(409, {
          "Content-Type": "application/json"
        })

        res.end(JSON.stringify({
          error:
            "This student is already enrolled for this school year."
        }))

        return
      }

      res.writeHead(500, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Failed to create enrollment"
      }))
    }
  })

  return
}

// =========================================================
// FUND COLLECTION — PAYMENT RECORDS
// =========================================================
if (
  req.method === "GET" &&
  req.url.startsWith("/api/payments/paid-terms")
) {
  const url =
    new URL(
      req.url,
      `http://${req.headers.host}`
    )

  const studentId =
    url.searchParams.get("studentId")

  const schoolYear =
    url.searchParams.get("schoolYear")

  if (!studentId || !schoolYear) {
    res.writeHead(400, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error:
        "Student ID and school year are required."
    }))

    return
  }

  try {
    const result =
      await db.query(
        `
        SELECT term
        FROM payments
        WHERE student_id = $1
        AND school_year = $2
        ORDER BY term
        `,
        [
          studentId,
          schoolYear
        ]
      )

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      paidTerms:
        result.rows.map(
          row => Number(row.term)
        )
    }))

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error:
        "Failed to check paid terms."
    }))
  }

  return
}

if (
  req.method === "GET" &&
  req.url.startsWith("/api/payments")
) {
    const url =
    new URL(
      req.url,
      `http://${req.headers.host}`
    )

  const schoolYear =
    url.searchParams.get(
      "schoolYear"
    ) || "2026-2027"
  try {
    const result = await db.query(`
      SELECT
        payments.id,
        payments.student_id,
        payments.school_year,
        payments.term,
        payments.amount,
        payments.mode_of_payment,
        payments.payment_date,
        students.student_number,
        students.first_name,
        students.last_name
      FROM payments
      JOIN students
        ON payments.student_id = students.id
      WHERE payments.school_year = $1
      ORDER BY
        payments.payment_date DESC,
        payments.id DESC
        `,
    [schoolYear]
    )
    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify(result.rows))

  } catch (error) {
    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to load payments"
    }))
  }

  return
}


if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/payments/")
) {
  const paymentId =
    req.url.split("/")[3]

  try {
    if (!paymentId) {
      res.writeHead(400, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Payment ID is required"
      }))

      return
    }

    const result = await db.query(`
      DELETE FROM payments
      WHERE id = $1
      RETURNING id
    `, [paymentId])

    if (result.rows.length === 0) {
      res.writeHead(404, {
        "Content-Type": "application/json"
      })

      res.end(JSON.stringify({
        error: "Payment not found"
      }))

      return
    }

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      message: "Payment deleted successfully",
      id: result.rows[0].id
    }))

  } catch (error) {
    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to delete payment"
    }))
  }

  return
}

// =========================================================
// FUND COLLECTION — OVERVIEW
// =========================================================

if (
  req.method === "GET" &&
  req.url.startsWith("/api/fund-collection")
) {
  try {
    const url =
      new URL(
        req.url,
        `http://${req.headers.host}`
      )

    const schoolYear =
      url.searchParams.get(
        "schoolYear"
      ) || "2026-2027"

    const result = await db.query(`
      SELECT
        (
        SELECT COUNT(*)
        FROM enrollments
        WHERE school_year = $1
        ) * 150 AS expected_collection,

        (
          SELECT COALESCE(SUM(amount), 0)
          FROM payments
          WHERE school_year = $1
        ) AS total_collected
    `, [schoolYear])

    const expected =
      Number(result.rows[0].expected_collection)

    const collected =
      Number(result.rows[0].total_collected)

    const remaining =
      expected - collected

    let rate = 0

    if (expected > 0) {
      rate = (collected / expected) * 100
    }

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      expectedCollection: expected,
      totalCollected: collected,
      remainingCollection: remaining,
      collectionRate: rate
    }))

  } catch (error) {
    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error: "Failed to load fund collection overview"
    }))
  }

  return
}

if (
  req.method === "GET" &&
  req.url.startsWith("/api/collection-status")
) {
    const url =
    new URL(
      req.url,
      `http://${req.headers.host}`
    )

    const schoolYear =
      url.searchParams.get(
        "schoolYear"
      ) || "2026-2027"
    try {
    const result = await db.query(`
      SELECT
        students.id,
        students.student_number,
        students.first_name,
        students.last_name,
        enrollments.school_year,

        COALESCE(
          SUM(payments.amount),
          0
        ) AS total_paid

      FROM enrollments

      JOIN students
        ON enrollments.student_id = students.id

      LEFT JOIN payments
        ON payments.student_id = enrollments.student_id
        AND payments.school_year = enrollments.school_year

      WHERE enrollments.school_year = $1

      GROUP BY
        students.id,
        students.student_number,
        students.first_name,
        students.last_name,
        enrollments.school_year

      ORDER BY
        enrollments.school_year DESC,
        students.student_number
        `,
    [schoolYear]
    )

    const records = result.rows.map(record => {
      const totalPaid =
        Number(record.total_paid)

      const expectedAmount = 150

      const remaining =
        Math.max(
          expectedAmount - totalPaid,
          0
        )

      let status = "Unpaid"

      if (totalPaid >= expectedAmount) {
        status = "Fully Paid"
      } else if (totalPaid > 0) {
        status = "Partially Paid"
      }

      return {
        id: record.id,
        studentNumber:
          record.student_number,
        firstName:
          record.first_name,
        lastName:
          record.last_name,
        schoolYear:
          record.school_year,
        expectedAmount:
          expectedAmount,
        totalPaid:
          totalPaid,
        remaining:
          remaining,
        status:
          status
      }
    })

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify(records))

  } catch (error) {
    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(JSON.stringify({
      error:
        "Failed to load collection status"
    }))
  }

  return
}

// =========================================================
// EVENTS — APPROVE EVENT
// =========================================================
if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/events/") &&
  !req.url.endsWith("/cancel") &&
  !req.url.endsWith("/approve") &&
  !req.url.endsWith("/status") &&
  !req.url.endsWith("/pre-audit")
) {

  try {

    const eventId =
      req.url.split("/")[3]

    await db.query(
      `
      DELETE FROM events
      WHERE id = $1
      `,
      [eventId]
    )

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        success: true
      })
    )

  } catch (error) {

    console.error(
      "Delete event error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to delete event."
      })
    )
  }

  return
}

if (
  req.method === "POST" &&
  req.url.startsWith("/api/events/") &&
  req.url.endsWith("/cancel")
) {
  const eventId =
    req.url.split("/")[3]

  try {
    await db.query(
      `
      UPDATE events
      SET status = 'Cancelled'
      WHERE id = $1
      `,
      [eventId]
    )

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        success: true
      })
    )

  } catch (error) {
    console.error(
      "Cancel event error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to cancel event."
      })
    )
  }

  return
}

if (
  req.method === "POST" &&
  req.url.startsWith("/api/events/") &&
  req.url.endsWith("/status")
) {

  try {

    const eventId =
      req.url.split("/")[3]

    let body = ""

    req.on("data", chunk => {
      body += chunk
    })

    req.on("end", async () => {

      const data =
        JSON.parse(body)

      const status =
        data.status

      const allowedStatuses = [
        "Ready",
        "On-going",
        "Completed"
      ]

      if (
        !allowedStatuses.includes(status)
      ) {

        res.writeHead(400, {
          "Content-Type":
            "application/json"
        })

        res.end(
          JSON.stringify({
            error:
              "Invalid event status."
          })
        )

        return
      }

      await db.query(
        `
        UPDATE events
        SET status = $1
        WHERE id = $2
        `,
        [
          status,
          eventId
        ]
      )

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          success: true,
          status: status
        })
      )
    })

  } catch (error) {

    console.error(
      "Change event status error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to change event status."
      })
    )
  }

  return
}

if (
  req.method === "POST" &&
  req.url.startsWith("/api/events/") &&
  req.url.endsWith("/approve")
) {

  const eventId =
    req.url.split("/")[3]

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      const approvedAllocation =
        Number(
          data.approvedAllocation
        )

      if (
        !eventId
      ) {
        throw new Error(
          "Event ID is required."
        )
      }

      if (
        !Number.isFinite(
          approvedAllocation
        ) ||
        approvedAllocation <= 0
      ) {
        throw new Error(
          "Approved allocation must be greater than zero."
        )
      }

      const fundResult =
        await db.query(
          `
          SELECT
            COALESCE(
              SUM(amount),
              0
            ) AS available_fund
          FROM payments
          `
        )

      const allocationResult =
        await db.query(
          `
          SELECT
            COALESCE(
              SUM(approved_allocation),
              0
            ) AS allocated_fund
          FROM events
          WHERE status IN (
            'Approved',
            'Execution',
            'Completed'
          )
          AND id <> $1
          `,
          [eventId]
        )

      const availableFund =
        Number(
          fundResult.rows[0]
            .available_fund
        )

      const alreadyAllocated =
        Number(
          allocationResult.rows[0]
            .allocated_fund
        )

      const remainingFund =
        availableFund -
        alreadyAllocated

      if (
        approvedAllocation >
        remainingFund
      ) {
        throw new Error(
          `Insufficient remaining fund. Only ₱${remainingFund.toLocaleString(
            "en-PH",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }
          )} is available.`
        )
      }

      const result =
        await db.query(
          `
          UPDATE events
          SET
            status = 'Approved',
            approved_allocation = $1
          WHERE id = $2
          RETURNING *
          `,
          [
            approvedAllocation,
            eventId
          ]
        )

      if (
        result.rows.length === 0
      ) {
        throw new Error(
          "Event not found."
        )
      }

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          success: true,
          event:
            result.rows[0]
        })
      )

    } catch (error) {

      console.error(
        "Approve event error:",
        error
      )

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to approve event."
        })
      )
    }
  })

  return
}

// =========================================================
// EVENT TRANSACTIONS — GET TRANSACTIONS
// =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/event-transactions"
) {

  try {

    const result =
      await db.query(
        `
        SELECT
          event_transactions.id,
          event_transactions.event_id,
          events.event_name,
          event_transactions.transaction_type,
          event_transactions.description,
          event_transactions.amount,
          TO_CHAR(
            event_transactions.transaction_date,
            'YYYY-MM-DD'
          ) AS transaction_date,          
          event_transactions.mode_of_payment,
          event_transactions.reference_number,
          event_transactions.created_at
        FROM event_transactions

        LEFT JOIN events
          ON event_transactions.event_id =
             events.id

        ORDER BY
          event_transactions.transaction_date DESC,
          event_transactions.id DESC
        `
      )


    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })


    res.end(
      JSON.stringify(
        result.rows
      )
    )

  } catch (error) {

    console.error(
      "Get event transactions error:",
      error
    )


    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })


    res.end(
      JSON.stringify({
        error:
          "Failed to load transactions."
      })
    )

  }

  return
}

// =========================================================
// EVENT TRANSACTIONS — DELETE TRANSACTION
// =========================================================

if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/event-transactions/")
) {

  const transactionId =
    req.url.split("/")[3]

  try {

    if (!transactionId) {
      throw new Error(
        "Transaction ID is required."
      )
    }

    const result =
      await db.query(
        `
        DELETE FROM event_transactions
        WHERE id = $1
        RETURNING *
        `,
        [transactionId]
      )

    if (
      result.rows.length === 0
    ) {
      throw new Error(
        "Transaction not found."
      )
    }

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        success: true,
        transaction:
          result.rows[0]
      })
    )

  } catch (error) {

    console.error(
      "Delete event transaction error:",
      error
    )

    res.writeHead(400, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          error.message ||
          "Failed to delete transaction."
      })
    )

  }

  return
}



// =========================================================
// EVENT TRANSACTIONS — SPENDING LIMIT
// =========================================================

if (
  req.method === "GET" &&
  req.url.startsWith("/api/event-transactions/spending-limit")
) {

  try {

    const url =
      new URL(
        req.url,
        `http://${req.headers.host}`
      )

    const eventId =
      url.searchParams.get(
        "eventId"
      )

    // =====================================================
    // GENERAL FUND
    //
    // General Fund =
    // Payments
    // + General Income
    // - General Expenses
    // - Approved Event Allocations
    // =====================================================

    if (!eventId) {

      const fundResult =
        await db.query(
          `
          SELECT

            COALESCE(
              (
                SELECT SUM(amount)
                FROM payments
              ),
              0
            )

            +

            COALESCE(
              (
                SELECT SUM(amount)
                FROM event_transactions
                WHERE event_id IS NULL
                AND transaction_type = 'Income'
              ),
              0
            )

            -

            COALESCE(
              (
                SELECT SUM(amount)
                FROM event_transactions
                WHERE event_id IS NULL
                AND transaction_type = 'Expense'
              ),
              0
            )

            +

            COALESCE(
              (
                SELECT SUM(amount)
                FROM event_transactions
                WHERE transaction_type = 'Income'
                AND event_id IS NOT NULL
                AND event_id IN (
                  SELECT id
                  FROM events
                  WHERE status = 'Completed'
                )
              ),
              0
            )

            -

            COALESCE(
              (
                SELECT SUM(amount)
                FROM event_transactions
                WHERE transaction_type = 'Expense'
                AND event_id IS NOT NULL
                AND event_id IN (
                  SELECT id
                  FROM events
                  WHERE status = 'Completed'
                )
              ),
              0
            )

            -

            COALESCE(
              (
                SELECT SUM(approved_allocation)
                FROM events
                WHERE status = 'Approved'
              ),
              0
            )

            AS available_amount
          `
        )

      const availableAmount =
        Number(
          fundResult.rows[0]
            .available_amount
        )

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          type:
            "General Fund",

          availableAmount:
            availableAmount
        })
      )

      return
    }

    // =====================================================
    // EVENT FUND
    //
    // Event Fund =
    // Approved Allocation
    // + Event Income
    // - Event Expenses
    // =====================================================

    const eventResult =
      await db.query(
        `
        SELECT

          COALESCE(
            approved_allocation,
            0
          )

          +

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id = $1
              AND transaction_type = 'Income'
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id = $1
              AND transaction_type = 'Expense'
            ),
            0
          )

          AS available_amount

        FROM events

        WHERE id = $1
        `,
        [eventId]
      )

    if (
      eventResult.rows.length === 0
    ) {

      throw new Error(
        "Event not found."
      )

    }

    const availableAmount =
      Number(
        eventResult.rows[0]
          .available_amount
      )

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        type:
          "Event",

        availableAmount:
          availableAmount
      })
    )

  } catch (error) {

    console.error(
      "Spending limit error:",
      error
    )

    res.writeHead(400, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          error.message ||
          "Failed to calculate spending limit."
      })
    )

  }

  return
}

// =========================================================
// EVENT TRANSACTIONS — RECORD TRANSACTION
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/event-transactions"
) {

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body || "{}")


      const eventId =
        data.eventId
          ? Number(data.eventId)
          : null

      const transactionType =
        String(
          data.transactionType || ""
        ).trim()

      const description =
        String(
          data.description || ""
        ).trim()

      const amount =
        Number(
          data.amount
        )

      const transactionDate =
        data.transactionDate

      const modeOfPayment =
        String(
          data.modeOfPayment || ""
        ).trim() || null

      const referenceNumber =
        String(
          data.referenceNumber || ""
        ).trim() || null


      // -----------------------------------------
      // VALIDATION
      // -----------------------------------------

      if (
        transactionType !== "Income" &&
        transactionType !== "Expense"
      ) {

        throw new Error(
          "Transaction type must be Income or Expense."
        )

      }


      if (!description) {

        throw new Error(
          "Transaction description is required."
        )

      }


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        throw new Error(
          "Transaction amount must be greater than zero."
        )

      }


      if (!transactionDate) {

        throw new Error(
          "Transaction date is required."
        )

      }


      // -----------------------------------------
      // CHECK EVENT
      // -----------------------------------------

      if (eventId !== null) {

        const eventResult =
          await db.query(
            `
            SELECT
              id,
              event_name,
              status
            FROM events
            WHERE id = $1
            `,
            [eventId]
          )


        if (
          eventResult.rows.length === 0
        ) {

          throw new Error(
            "Selected event was not found."
          )

        }

      }


// =====================================================
// EXPENSE SPENDING LIMIT VALIDATION
// =====================================================

if (
  transactionType ===
  "Expense"
) {

  let availableToSpend = 0

  // ===================================================
  // GENERAL FUND EXPENSE
  //
  // General Fund =
  // Payments
  // + General Income
  // - General Expenses
  // - Approved Allocations
  // ===================================================

  if (eventId === null) {

    const fundResult =
      await db.query(
        `
        SELECT

          COALESCE(
            (
              SELECT SUM(amount)
              FROM payments
            ),
            0
          )

          +

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id IS NULL
              AND transaction_type = 'Income'
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id IS NULL
              AND transaction_type = 'Expense'
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(approved_allocation)
              FROM events
              WHERE status = 'Approved'
            ),
            0
          )

          AS available_amount
        `
      )

    availableToSpend =
      Number(
        fundResult.rows[0]
          .available_amount
      )

  }

  // ===================================================
  // EVENT EXPENSE
  //
  // Event Fund =
  // Approved Allocation
  // + Event Income
  // - Event Expenses
  // ===================================================

  else {

    const eventFundResult =
      await db.query(
        `
        SELECT

          COALESCE(
            approved_allocation,
            0
          )

          +

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id = $1
              AND transaction_type = 'Income'
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id = $1
              AND transaction_type = 'Expense'
            ),
            0
          )

          AS available_amount

        FROM events

        WHERE id = $1
        `,
        [eventId]
      )

    if (
      eventFundResult.rows.length === 0
    ) {

      throw new Error(
        "Selected event was not found."
      )

    }

    availableToSpend =
      Number(
        eventFundResult.rows[0]
          .available_amount
      )

  }

  // ===================================================
  // FINAL VALIDATION
  // ===================================================

  if (
    amount >
    availableToSpend
  ) {

    throw new Error(
      `Expense exceeds available amount. Only ₱${availableToSpend.toLocaleString(
        "en-PH",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )} is available to spend.`
    )

  }

}      
      // -----------------------------------------
      // RECORD TRANSACTION
      // -----------------------------------------

      const result =
        await db.query(
          `
          INSERT INTO event_transactions (
            event_id,
            transaction_type,
            description,
            amount,
            transaction_date,
            mode_of_payment,
            reference_number
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
          )
          RETURNING *
          `,
          [
            eventId,
            transactionType,
            description,
            amount,
            transactionDate,
            modeOfPayment,
            referenceNumber
          ]
        )


      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })


      res.end(
        JSON.stringify({
          success: true,
          transaction:
            result.rows[0]
        })
      )

    } catch (error) {

      console.error(
        "Record event transaction error:",
        error
      )


      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })


      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to record transaction."
        })
      )

    }

  })

  return
}
  
// =========================================================
// EVENTS — GET ALL EVENTS
// =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/events"
) {
  try {
    const result = await db.query(`
      SELECT
        id,
        event_name,
        event_date,
        location,
        description,
        status,
        approved_allocation,
        created_at
      FROM events
      ORDER BY event_date DESC, id DESC
    `)

    res.writeHead(200, {
      "Content-Type": "application/json"
    })

    res.end(
      JSON.stringify(result.rows)
    )

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type": "application/json"
    })

    res.end(
      JSON.stringify({
        error: "Failed to load events"
      })
    )
  }

  return
}


// =========================================================
// EVENTS — ADD EVENT
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/events"
) {
  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      if (!data.eventName) {
        throw new Error(
          "Event name is required."
        )
      }

      if (!data.eventDate) {
        throw new Error(
          "Event date is required."
        )
      }

      const result =
        await db.query(
          `
          INSERT INTO events (
            event_name,
            event_date,
            location,
            description,
            status
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING *
          `,
          [
            data.eventName,
            data.eventDate,
            data.location || null,
            data.description || null,
            data.status || "Planning"
          ]
        )

      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to create event"
        })
      )
    }
  })

  return
}

// =========================================================
// EVENTS — GET ONE EVENT
// =========================================================

if (
  req.method === "GET" &&
  req.url.startsWith("/api/events/") &&
  !req.url.endsWith("/financial-summary") &&
  !req.url.endsWith("/pre-audit")
) {

  const eventId =
    req.url.split("/")[3]

  try {

    const result =
      await db.query(
        `
        SELECT
          id,
          event_name,
          event_date,
          location,
          description,
          status,
          approved_allocation,
          created_at
        FROM events
        WHERE id = $1
        `,
        [eventId]
      )

    if (result.rows.length === 0) {

      res.writeHead(404, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            "Event not found"
        })
      )

      return
    }

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify(
        result.rows[0]
      )
    )

  } catch (error) {

    console.error(
      "Get one event error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load event"
      })
    )

  }

  return
}

// =========================================================
// EVENTS — PRE-AUDIT
// =========================================================

if (
  req.method === "GET" &&
  req.url.startsWith("/api/events/") &&
  req.url.endsWith("/pre-audit")
) {

  try {

    const eventId =
      req.url.split("/")[3]

    const expenseResult =
      await db.query(
        `
        SELECT
          id,
          description,
          amount
        FROM event_expected_expenses
        WHERE event_id = $1
        ORDER BY id ASC
        `,
        [eventId]
      )

    const incomeResult =
      await db.query(
        `
        SELECT
          id,
          description,
          amount
        FROM event_expected_income
        WHERE event_id = $1
        ORDER BY id ASC
        `,
        [eventId]
      )

    const expenseTotal =
      expenseResult.rows.reduce(
        (total, item) =>
          total + Number(item.amount),
        0
      )

    const incomeTotal =
      incomeResult.rows.reduce(
        (total, item) =>
          total + Number(item.amount),
        0
      )

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        expenses:
          expenseResult.rows,

        income:
          incomeResult.rows,

        totalExpenses:
          expenseTotal,

        totalIncome:
          incomeTotal
      })
    )

  } catch (error) {

    console.error(error)

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load pre-audit data."
      })
    )
  }

  return
}

// =========================================================
// EVENTS — ADD EXPECTED EXPENSE
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/event-expected-expenses"
) {

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      if (!data.eventId) {
        throw new Error(
          "Event ID is required."
        )
      }

      if (!data.description) {
        throw new Error(
          "Expense description is required."
        )
      }

      if (
        data.amount === undefined ||
        Number(data.amount) <= 0
      ) {
        throw new Error(
          "Expense amount must be greater than zero."
        )
      }

      const result =
        await db.query(
          `
          INSERT INTO event_expected_expenses (
            event_id,
            description,
            amount
          )
          VALUES (
            $1,
            $2,
            $3
          )
          RETURNING *
          `,
          [
            data.eventId,
            data.description,
            Number(data.amount)
          ]
        )

      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to add expected expense."
        })
      )
    }
  })

  return
}


// =========================================================
// EVENTS — ADD EXPECTED INCOME
// =========================================================

if (
  req.method === "POST" &&
  req.url === "/api/event-expected-income"
) {

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      if (!data.eventId) {
        throw new Error(
          "Event ID is required."
        )
      }

      if (!data.description) {
        throw new Error(
          "Income description is required."
        )
      }

      if (
        data.amount === undefined ||
        Number(data.amount) <= 0
      ) {
        throw new Error(
          "Income amount must be greater than zero."
        )
      }

      const result =
        await db.query(
          `
          INSERT INTO event_expected_income (
            event_id,
            description,
            amount
          )
          VALUES (
            $1,
            $2,
            $3
          )
          RETURNING *
          `,
          [
            data.eventId,
            data.description,
            Number(data.amount)
          ]
        )

      res.writeHead(201, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to add expected income."
        })
      )
    }
  })

  return
}

// =========================================================
// EVENT EXPECTED EXPENSES — UPDATE
// =========================================================

if (
  req.method === "PUT" &&
  req.url.startsWith("/api/event-expected-expenses/")
) {

  const expenseId =
    req.url.split("/")[3]

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      if (!data.description) {
        throw new Error(
          "Expense description is required."
        )
      }

      if (
        data.amount === undefined ||
        Number(data.amount) <= 0
      ) {
        throw new Error(
          "Expense amount must be greater than zero."
        )
      }

      const result =
        await db.query(
          `
          UPDATE event_expected_expenses
          SET
            description = $1,
            amount = $2
          WHERE id = $3
          RETURNING *
          `,
          [
            data.description,
            Number(data.amount),
            expenseId
          ]
        )

      if (result.rows.length === 0) {
        throw new Error(
          "Expense record not found."
        )
      }

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to update expected expense."
        })
      )
    }
  })

  return
}


// =========================================================
// EVENT EXPECTED EXPENSES — DELETE
// =========================================================

if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/event-expected-expenses/")
) {

  const expenseId =
    req.url.split("/")[3]

  try {

    if (!expenseId) {
      throw new Error(
        "Expense ID is required."
      )
    }

    const result =
      await db.query(
        `
        DELETE FROM event_expected_expenses
        WHERE id = $1
        RETURNING id
        `,
        [expenseId]
      )

    if (result.rows.length === 0) {

      res.writeHead(404, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            "Expense record not found."
        })
      )

      return
    }

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        success: true,
        id:
          result.rows[0].id
      })
    )

  } catch (error) {

    console.error(
      "Delete expected expense error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          error.message ||
          "Failed to delete expected expense."
      })
    )
  }

  return
}


// =========================================================
// EVENT EXPECTED INCOME — UPDATE
// =========================================================

if (
  req.method === "PUT" &&
  req.url.startsWith("/api/event-expected-income/")
) {

  const incomeId =
    req.url.split("/")[3]

  let body = ""

  req.on("data", chunk => {
    body += chunk
  })

  req.on("end", async () => {

    try {

      const data =
        JSON.parse(body)

      if (!data.description) {
        throw new Error(
          "Income description is required."
        )
      }

      if (
        data.amount === undefined ||
        Number(data.amount) <= 0
      ) {
        throw new Error(
          "Income amount must be greater than zero."
        )
      }

      const result =
        await db.query(
          `
          UPDATE event_expected_income
          SET
            description = $1,
            amount = $2
          WHERE id = $3
          RETURNING *
          `,
          [
            data.description,
            Number(data.amount),
            incomeId
          ]
        )

      if (result.rows.length === 0) {
        throw new Error(
          "Income record not found."
        )
      }

      res.writeHead(200, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify(
          result.rows[0]
        )
      )

    } catch (error) {

      console.error(error)

      res.writeHead(400, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            error.message ||
            "Failed to update expected income."
        })
      )
    }
  })

  return
}


// =========================================================
// EVENT EXPECTED INCOME — DELETE
// =========================================================

if (
  req.method === "DELETE" &&
  req.url.startsWith("/api/event-expected-income/")
) {

  const incomeId =
    req.url.split("/")[3]

  try {

    if (!incomeId) {
      throw new Error(
        "Income ID is required."
      )
    }

    const result =
      await db.query(
        `
        DELETE FROM event_expected_income
        WHERE id = $1
        RETURNING id
        `,
        [incomeId]
      )

    if (result.rows.length === 0) {

      res.writeHead(404, {
        "Content-Type":
          "application/json"
      })

      res.end(
        JSON.stringify({
          error:
            "Income record not found."
        })
      )

      return
    }

    res.writeHead(200, {
      "Content-Type":
        "application/json"
      })

    res.end(
      JSON.stringify({
        success: true,
        id:
          result.rows[0].id
      })
    )

  } catch (error) {

    console.error(
      "Delete expected income error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          error.message ||
          "Failed to delete expected income."
      })
    )
  }

  return
}

// =========================================================
// EVENTS — FINANCIAL SUMMARY
// =========================================================

if (
  req.method === "GET" &&
  req.url === "/api/events/financial-summary"
) {

  try {

    // =====================================================
    // GENERAL FUND
    //
    // Payments
    // + General Income
    // - General Expenses 
    // - Approved Allocations
    // =====================================================

    const fundResult =
      await db.query(
        `
        SELECT

          COALESCE(
            (
              SELECT SUM(amount)
              FROM payments
            ),
            0
          )

          +

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id IS NULL
              AND transaction_type = 'Income'
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE event_id IS NULL
              AND transaction_type = 'Expense'
            ),
            0
          )

          +

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE transaction_type = 'Income'
              AND event_id IS NOT NULL
              AND event_id IN (
                SELECT id
                FROM events
                WHERE status = 'Completed'
              )
            ),
            0
          )

          -

          COALESCE(
            (
              SELECT SUM(amount)
              FROM event_transactions
              WHERE transaction_type = 'Expense'
              AND event_id IS NOT NULL
              AND event_id IN (
                SELECT id
                FROM events
                WHERE status = 'Completed'
              )
            ),
            0
          )

          AS general_fund
        `
      )

    // =====================================================
    // APPROVED ALLOCATIONS
    // =====================================================

    const allocationResult =
      await db.query(
        `
        SELECT
          COALESCE(
            SUM(approved_allocation),
            0
          ) AS allocated_fund

        FROM events

        WHERE status IN ('Approved', 'Ready', 'On-going')
        `
      )

    const generalFund =
      Number(
        fundResult.rows[0]
          .general_fund
      )

    const allocatedFund =
      Number(
        allocationResult.rows[0]
          .allocated_fund
      )

    const remainingFund =
      generalFund -
      allocatedFund

    res.writeHead(200, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        availableFund:
          generalFund,

        allocatedFund:
          allocatedFund,

        remainingFund:
          remainingFund
      })
    )

  } catch (error) {

    console.error(
      "Financial summary error:",
      error
    )

    res.writeHead(500, {
      "Content-Type":
        "application/json"
    })

    res.end(
      JSON.stringify({
        error:
          "Failed to load financial summary."
      })
    )

  }

  return
}

// =========================================================
// SERVE FRONTEND FILES
// =========================================================

const url =
  new URL(
    req.url,
    `http://${req.headers.host}`
  )

let requestedFile =
  url.pathname === "/"
    ? "index.html"
    : url.pathname.substring(1)

let filePath =
  path.join(
    __dirname,
    requestedFile
  )

fs.readFile(
  filePath,
  (error, data) => {

    if (error) {

      res.writeHead(404, {
        "Content-Type":
          "text/plain"
      })

      res.end("Not Found")

      return
    }

    let extension =
      path.extname(filePath)

    let contentType =
      "text/plain"

    if (extension === ".html") {
      contentType =
        "text/html"
    }
    else if (extension === ".css") {
      contentType =
        "text/css"
    }
    else if (extension === ".js") {
      contentType =
        "text/javascript"
    }

    res.writeHead(200, {
      "Content-Type":
        contentType
    })

    res.end(data)
  }
)

})

server.listen(
  process.env.PORT || 3000,
  () => {
    console.log(
      `Server running on port ${process.env.PORT || 3000}`
    )
  }
)