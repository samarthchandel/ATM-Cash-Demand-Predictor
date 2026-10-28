  import { useEffect, useState } from "react";
  import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from "recharts";
  import "./App.css";

  function App() {
    
const [username, setUsername] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [email, setEmail] = useState("");
const [isRegister, setIsRegister] = useState(false);
const [authMessage, setAuthMessage] = useState("");


    const [token, setToken] = useState(localStorage.getItem("access_token"));
    const [isAdmin, setIsAdmin] = useState(
      localStorage.getItem("is_admin") === "true"
    );
    const [showAdmin, setShowAdmin] = useState(false);

    const [error, setError] = useState("");

    // Prediction fields
    const [withdrawals, setWithdrawals] = useState("");
    const [deposits, setDeposits] = useState("");
    const [holiday, setHoliday] = useState("0");
    const [specialEvent, setSpecialEvent] = useState("0");

    const [prediction, setPrediction] = useState(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [predictionError, setPredictionError] = useState("");

    // Prediction history
    const [history, setHistory] = useState([]);
    const [historyError, setHistoryError] = useState("");
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Admin data
    const [adminStats, setAdminStats] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminPredictions, setAdminPredictions] = useState([]);
    const [adminError, setAdminError] = useState("");

   
    // LOGIN
   
    const handleLogin = async (event) => {
      event.preventDefault();
      setError("");

      try {
        const response = await fetch("http://127.0.0.1:8000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.access_token) {
          throw new Error(data.message || "Login failed");
        }

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("is_admin", data.is_admin ? "true" : "false");

        setToken(data.access_token);
        setIsAdmin(Boolean(data.is_admin));
        setShowAdmin(false);
      } catch (err) {
        setError(err.message);
      }
    };
    

const handleRegister = async (event) => {
  event.preventDefault();
  setError("");
  setAuthMessage("");


  try {
const passwordValid =
  password.length >= 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[0-9]/.test(password) && 
  /[^A-Za-z0-9]/.test(password);

if (!passwordValid) {
  setError(
    "Password must have 8+ characters, uppercase, lowercase, a number, and a special character."
  );
  return;
}

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

    const response = await fetch("http://127.0.0.1:8000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || "Registration failed");
    }

    if (data.message !== "User registered successfully") {
      throw new Error(data.message || "Registration failed");
    }

    setAuthMessage("Registration successful! You can now log in.");
    setIsRegister(false);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setEmail("");
  } catch (err) {
    setError(err.message || "Could not connect to the server");
  }
};

   
    // LOAD HISTORY
   
    const loadHistory = async () => {
      if (!token) return;

      setLoadingHistory(true);
      setHistoryError("");

      try {
        const response = await fetch(
          "http://127.0.0.1:8000/predictions/history",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load prediction history");
        }

        setHistory(data.predictions || []);
      } catch (err) {
        setHistoryError(err.message);
      } finally {
        setLoadingHistory(false);
      }
    };

    useEffect(() => {
      if (token && !showAdmin) {
        loadHistory();
      }
    }, [token, showAdmin]);

   
    // LOAD ADMIN DATA
   
    const loadAdminData = async () => {
      if (!token || !isAdmin) return;

      setAdminError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const [statsResponse, usersResponse, predictionsResponse] =
          await Promise.all([
            fetch("http://127.0.0.1:8000/admin/stats", { headers }),
            fetch("http://127.0.0.1:8000/admin/users", { headers }),
            fetch("http://127.0.0.1:8000/admin/predictions", { headers }),
          ]);

        if (
          !statsResponse.ok ||
          !usersResponse.ok ||
          !predictionsResponse.ok
        ) {
          throw new Error("Admin access denied");
        }

        const stats = await statsResponse.json();
        const users = await usersResponse.json();
        const predictions = await predictionsResponse.json();

        setAdminStats(stats);
        setAdminUsers(users.users || []);
        setAdminPredictions(predictions.predictions || []);
      } catch (err) {
        setAdminError(err.message);
      }
    };

    useEffect(() => {
      if (token && isAdmin && showAdmin) {
        loadAdminData();
      }
    }, [token, isAdmin, showAdmin]);

   
    // PREDICTION
   
    const handlePrediction = async (event) => {
      event.preventDefault();

      setPrediction(null);
      setPredictionError("");
      setIsPredicting(true);

      try {
        const response = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            total_withdrawals: Number(withdrawals),
            total_deposits: Number(deposits),
            holiday_flag: Number(holiday),
            special_event_flag: Number(specialEvent),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Prediction failed");
        }

        setPrediction(data.predicted_cash_demand);
        await loadHistory();
      } catch (err) {
        setPredictionError(err.message || "Could not generate a prediction. Please try again.");
      } finally {
        setIsPredicting(false);
      }
    };

   
    // LOGOUT
   
    const handleLogout = () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("is_admin");

      setToken(null);
      setIsAdmin(false);
      setShowAdmin(false);
      setPrediction(null);
      setHistory([]);
    };

   
    // DASHBOARD CALCULATIONS
   
    const totalPredictions = history.length;

    const averageDemand =
      totalPredictions > 0
        ? history.reduce(
            (sum, item) => sum + Number(item.predicted_cash_demand),
            0
          ) / totalPredictions
        : 0;

    const highestDemand =
      totalPredictions > 0
        ? Math.max(
            ...history.map((item) => Number(item.predicted_cash_demand))
          )
        : 0;

    const latestDemand =
      totalPredictions > 0 ? Number(history[0].predicted_cash_demand) : 0;

    const chartData = [...history].reverse().map((item, index) => ({
      name: `Prediction ${index + 1}`,
      withdrawals: Number(item.total_withdrawals),
      deposits: Number(item.total_deposits),
      demand: Number(item.predicted_cash_demand),
    }));

   
    // LOGIN PAGE
   
   
if (!token) {
  return (
    <div className="app">
      <div className="login-container">
        <div className="login-card">
          <div className="login-logo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19V5m0 14h16M7 15l4-4 3 2 5-6" /></svg></div>
          <p className="login-kicker">SMART CASH OPERATIONS</p>
          <h1>ATM Cash Demand Predictor</h1>

          <p className="description">
            {isRegister
              ? "Create an account to get started."
              : "Login to access the prediction dashboard."}
          </p>



              <form onSubmit={isRegister ? handleRegister : handleLogin}>
  <div className="form-group">
    <label>Username</label>
    <input
      type="text"
      value={username}
      onChange={(event) => setUsername(event.target.value)}
      placeholder="Enter username"
      required
    />
  </div>

  {isRegister && (
    <div className="form-group">
      <label>Email</label>
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter email address"
        required
      />
    </div>
  )}

  <div className="form-group">
    <label>Password</label>
    <input
      type="password"
      value={password}
      onChange={(event) => setPassword(event.target.value)}
      placeholder="Enter password"
      required
    />
  </div>
    
{isRegister && (
  <>
    <div className="form-group">
      <small>
        Password requirements:
        <br />• At least 8 characters
        <br />• One uppercase and one lowercase letter
        <br />• One number
        <br />• One special character
      </small>
    </div>

    <div className="form-group">
      <label>Confirm Password</label>
      <input
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
      />
    </div>
  </>
)}


  <button type="submit" className="predict-button">
    {isRegister ? "Create Account" : "Login"}
  </button>
</form>

{authMessage && <p className="authenticated">{authMessage}</p>}
{error && <p className="error">{error}</p>}

<p className="description">
  {isRegister ? "Already have an account?" : "New here?"}{" "}
  <button
    type="button"
    className="admin-button"
    onClick={() => {
      setIsRegister((current) => !current);
      setError("");
      setAuthMessage("");
    }}
  >
    {isRegister ? "Login" : "Register"}
  </button>
</p>
            </div>
          </div>
        </div>
      );
    }

   
    // LOGGED-IN APPLICATION
   
    return (
      <div className="app">
        <header className="navbar">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">ATM</div>
            <div>
              <h1>Cashflow<span>IQ</span></h1>
              <p>ATM cash demand forecasting</p>
            </div>
          </div>

          <div className="navbar-actions">
            {isAdmin && (
              <button
                className="admin-button"
                onClick={() => setShowAdmin((current) => !current)}
              >
                {showAdmin ? "Dashboard" : "Admin Panel"}
              </button>
            )}

            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {/* =========================
            ADMIN PANEL
        ========================= */}
        {showAdmin && isAdmin ? (
          <main className="dashboard">
            <section className="card">
              <h2>Admin Panel</h2>
              <p className="description">
                System overview and administration.
              </p>

              {adminError && <p className="error">{adminError}</p>}

              {adminStats && (
                <div className="admin-stats">
                  <div className="stat-card">
                    <h3>Total Users</h3>
                    <p>{adminStats.total_users}</p>
                  </div>

                  <div className="stat-card">
                    <h3>Total Predictions</h3>
                    <p>{adminStats.total_predictions}</p>
                  </div>

                  <div className="stat-card">
                    <h3>Average Demand</h3>
                    <p>
                      ₹{Number(
                        adminStats.average_predicted_demand || 0
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="stat-card">
                    <h3>Total Admins</h3>
                    <p>{adminStats.total_admins}</p>
                  </div>
                </div>
              )}
            </section>

            <section className="card">
              <h2>Registered Users</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.is_admin ? "Admin" : "User"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card">
              <h2>All Predictions</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Withdrawals</th>
                      <th>Deposits</th>
                      <th>Holiday</th>
                      <th>Special Event</th>
                      <th>Predicted Demand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminPredictions.map((item) => (
                      <tr key={item.id}>
                        <td>{item.id}</td>
                        <td>{item.username || "Unknown"}</td>
                        <td>
                          ₹{Number(item.total_withdrawals).toLocaleString("en-IN")}
                        </td>
                        <td>
                          ₹{Number(item.total_deposits).toLocaleString("en-IN")}
                        </td>
                        <td>{item.holiday_flag ? "Yes" : "No"}</td>
                        <td>{item.special_event_flag ? "Yes" : "No"}</td>
                        <td>
                          ₹{Number(item.predicted_cash_demand).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        ) : (
          /* =========================
            USER DASHBOARD
          ========================= */
          <main className="dashboard">
            <section className="page-intro">
              <div>
                <p className="page-eyebrow">OPERATIONS OVERVIEW</p>
                <h2>Cash demand dashboard</h2>
                <p>Turn transaction activity into a clearer plan for tomorrow.</p>
              </div>
              <div className="live-status"><span className="status-dot" /> Forecast workspace</div>
            </section>

            {/* Analytics */}
            <section className="stats-grid">
              <div className="stat-card">
                <h3>Total Predictions</h3>
                <p>{totalPredictions}</p>
              </div>

              <div className="stat-card">
                <h3>Average Demand</h3>
                <p>
                  ₹{averageDemand.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="stat-card">
                <h3>Highest Demand</h3>
                <p>
                  ₹{highestDemand.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div className="stat-card">
                <h3>Latest Prediction</h3>
                <p>
                  ₹{latestDemand.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </section>

            {/* Prediction form */}
            <section className="card prediction-panel">
              <div className="prediction-heading">
                <div className="section-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V6m0 12h16M7 14l4-4 3 2 5-6" /></svg></div>
                <div>
                  <h2>Cash demand prediction</h2>
              <p className="description">
                Enter the previous day's ATM transaction details to predict the
                next day's cash demand. Enter amounts in Indian rupees.
                  </p>
                </div>
              </div>

              <form className="prediction-form" onSubmit={handlePrediction}>
                <div className="form-group">
                  <label htmlFor="total-withdrawals">Total withdrawals <span>(₹)</span></label>
                  <input
                    id="total-withdrawals"
                    type="number"
                    min="0"
                    step="any"
                    value={withdrawals}
                    
                    onChange={(event) => setWithdrawals(event.target.value)}
                    placeholder="Enter total withdrawals"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="total-deposits">Total deposits <span>(₹)</span></label>
                  <input
                    id="total-deposits"
                    type="number"
                    min="0"
                    step="any"
                    value={deposits}
                    onChange={(event) => setDeposits(event.target.value)}
                    placeholder="Enter total deposits"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="holiday-flag">Is tomorrow a holiday?</label>
                  <select
                    id="holiday-flag"
                    value={holiday}
                    onChange={(event) => setHoliday(event.target.value)}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="special-event-flag">Is there a special event?</label>
                  <select
                    id="special-event-flag"
                    value={specialEvent}
                    onChange={(event) => setSpecialEvent(event.target.value)}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </div>

                <button type="submit" className="predict-button" disabled={isPredicting}>
                  {isPredicting ? <><span className="button-spinner" /> Generating forecast…</> : <>Generate forecast <span aria-hidden="true">↗</span></>}
                </button>
              </form>

              <aside className={`prediction-result ${prediction !== null ? "has-result" : "is-empty"}`} aria-live="polite">
                <div className="result-topline"><span className="result-indicator" /> {prediction !== null ? "Forecast generated" : "Your forecast"}</div>
                <h3>Predicted cash demand</h3>
                {prediction !== null ? (
                  <p className="result-amount">₹{Number(prediction).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</p>
                ) : (
                  <p className="result-placeholder">₹ — — —</p>
                )}
                <p className="result-note">{prediction !== null ? "Use this estimate as a planning input, alongside local operational knowledge." : "Your estimate will appear here after you generate a forecast."}</p>
                <div className="result-footnote"><span className="result-footnote-mark">i</span><span>Model output is an estimate, not a guarantee of actual cash demand.</span></div>
              </aside>
              {predictionError && <p className="error prediction-error" role="alert">{predictionError}</p>}
            </section>

            {/* Charts */}
            {history.length > 0 && (
              <>
                <section className="card chart-card trend-chart">
                  <h2>Cash demand trend</h2>
                  <p className="description">
                    Predicted cash demand across your prediction history.
                  </p>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="demand"
                        name="Predicted Cash Demand"
                        stroke="#0c7567"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </section>

                <section className="card chart-card comparison-chart">
                  <h2>Withdrawals vs. predicted demand</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]} />
                      <Legend />
                      <Bar dataKey="withdrawals" name="Withdrawals" fill="#9abdb2" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="demand" name="Predicted Demand" fill="#0c7567" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>

                <section className="card chart-card comparison-chart">
                  <h2>Deposits vs. predicted demand</h2>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                      <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]} />
                      <Legend />
                      <Bar dataKey="deposits" name="Deposits" fill="#d8b55b" radius={[5, 5, 0, 0]} />
                      <Bar dataKey="demand" name="Predicted Demand" fill="#0c7567" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              </>
            )}

            {/* Prediction history */}
            <section className="card history-card">
              <div className="history-header">
                <div>
                  <h2>Prediction History</h2>
                  <p className="description">
                    Your previous cash-demand predictions.
                  </p>
                </div>

                <button
                  className="predict-button"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                >
                  {loadingHistory ? "Loading..." : "Refresh"}
                </button>
              </div>

              {historyError && <p className="error">{historyError}</p>}

              {!loadingHistory && history.length === 0 && !historyError && (
                <div className="empty-state">
                  <div className="empty-state-icon" aria-hidden="true">↗</div>
                  <h3>Your history starts here</h3>
                  <p>Generate your first forecast and it will be saved here for easy reference.</p>
                </div>
              )}

              {history.length > 0 && (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Withdrawals</th>
                        <th>Deposits</th>
                        <th>Holiday</th>
                        <th>Special Event</th>
                        <th>Predicted Demand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((item) => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>
                            {Number(item.total_withdrawals).toLocaleString("en-IN")}
                          </td>
                          <td>
                            {Number(item.total_deposits).toLocaleString("en-IN")}
                          </td>
                          <td>{item.holiday_flag === 1 ? "Yes" : "No"}</td>
                          <td>{item.special_event_flag === 1 ? "Yes" : "No"}</td>
                          <td>
                            ₹{Number(item.predicted_cash_demand).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        )}
      </div>
    );
  }

  export default App;
