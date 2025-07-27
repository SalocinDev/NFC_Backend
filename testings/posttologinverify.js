async function toLogin(name, password) {
    try {
      const response = await fetch('http://localhost:3000/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, password }),
      });
  
      const data = await response.json();
      
      console.log(data);
      

      if (data.success) {
        console.log("Login success");
  
        if (data.role === "admin") {
          console.log("Is admin");
          return "Is Admin";
        } else if (data.role === "member") {
          console.log("Is member");
          return "Is Member";
        }
      } else {
        console.log("Login Failed");
        return "Failed";
      }
    } catch (error) {
      console.error("Error during login:", error);
      return "Error";
    }
  }