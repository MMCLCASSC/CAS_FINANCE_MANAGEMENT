const loginForm =
  document.getElementById(
    "loginForm"
  )

loginForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault()

    const username =
      document.getElementById(
        "username"
      ).value

    const password =
      document.getElementById(
        "password"
      ).value

    try {

      const response =
        await fetch(
          "/api/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                username:
                  username,

                password:
                  password
              })
          }
        )

      const data =
        await response.json()

      if (!response.ok) {

        alert(
          data.error ||
          "Login failed."
        )

        return
      }

      window.location.href =
        "/index.html"

    } catch (error) {

      console.error(error)

      alert(
        "Unable to connect to the server."
      )
    }
  }
)