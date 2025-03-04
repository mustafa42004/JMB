import React, { useState } from "react";

const Signin = ({ handleLogin, error }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin(username, password);
  };

  return (
    <section>
      <div className="container my-5">
        <div className="row">
          <div className=" offset-md-3 col-md-6">
            <div className="card">
              <div className="card-header">
                <h4>Admin Login</h4>
              </div>
              <div className="card-body">
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="my-3">
                    <label htmlFor="username">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      name="username"
                      id="username"
                      className="form-control"
                    />
                  </div>
                  <div className="my-3">
                    <label htmlFor="password">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      name="password"
                      id="password"
                      className="form-control"
                    />
                  </div>
                  <div className="card-footer">
                    <button className="btn btn-primary" type="submit">
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Signin;
