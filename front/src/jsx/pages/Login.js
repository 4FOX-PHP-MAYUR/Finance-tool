import React, { useState } from 'react'
import { connect, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { loginAction } from '../../store/actions/AuthActions';
// const cors = require("cors");
//
import loginMainBg from '../../images/login-bg-blue-collage.png';
import romeoLogo from '../../images/ask-romeo-logo.png';

function Login (props) {
    const nav = useNavigate();
    const [email, setEmail] = useState('');
    let errorsObj = { email: '', password: '' };
    const [errors, setErrors] = useState(errorsObj);
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();

    function onLogin(e) {
        e.preventDefault();
        let error = false;
        const errorObj = { ...errorsObj };
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email === '') {
            errorObj.email = 'Email is required';
            error = true;
        } else if (!emailRegex.test(email)) {
            errorObj.email = 'Enter a valid email address';
            error = true;
        }
        if (password === '') {
            errorObj.password = 'Password is Required';
            error = true;
        }
        setErrors(errorObj);
        if (error) {
          return ;
        }
        dispatch(loginAction(email, password, nav));
    }

  return (
        <div className="login-main-page" style={{backgroundImage:"url("+ loginMainBg +")"}}>
            <div className="login-wrapper">
                <div className="login-aside-left">
                    <Link to="/dashboard" className="login-logo">
                        <img src={romeoLogo} alt="Ask Romeo logo" className="romeo-logo" />
                    </Link>
                    <div className="login-description">
                        <p className="fs-14 text-black">
                            Stay in control of your traffic operations with a clear, real-time view of everything that matters. Sign in to
                            access your dashboard, monitor flow, and make smarter decisions instantly.
                        </p>
                    </div>
                </div>
                <div className="login-aside-right">
                    <div className="row m-0 justify-content-center h-100 align-items-center">
                      <div className="col-xl-9 col-xxl-9">
                        <div className="authincation-content">
                          <div className="row no-gutters">
                            <div className="col-xl-12">
                              <div className="auth-form-1">
                                  <div className="mb-4">
                                      <h3 className="text-white mb-1">Welcome to Magnitude</h3>
                                      <p className="text-white">Sign in by entering information below</p>
                                  </div>
                                  {props.errorMessage && (
                                      <div className='bg-red-300 text-red-900 border border-red-900 p-1 my-2'>
                                          {props.errorMessage}
                                      </div>
                                  )}
                                  {props.successMessage && (
                                      <div className='bg-green-300 text-green-900 border border-green-900 p-1 my-2'>
                                          {props.successMessage}
                                      </div>
                                  )}
                                  <form onSubmit={onLogin}>
                                      <div className="form-group">
                                          <label className="mb-2 ">
                                            <strong className="text-white">Email</strong>
                                          </label>
                                          <input type="email" name='email' className="form-control"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                          />
                                        {errors.email && <div className="text-danger fs-12">{errors.email}</div>}
                                      </div>
                                      <div className="form-group">
                                          <label className="mb-2 "><strong className="text-white">Password</strong></label>
                                          <input name='password'
                                            type="password"
                                            className="form-control"
                                            value={password}
                                              onChange={(e) =>
                                                  setPassword(e.target.value)
                                              }
                                          />
                                          {errors.password && <div className="text-danger fs-12">{errors.password}</div>}
                                      </div>
                                    <div className="form-row d-flex justify-content-between mt-4 mb-2">
                                      <div className="form-group">
                                        <div className="form-check custom-checkbox ms-1 ">
                                          <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="basic_checkbox_1"
                                          />
                                          <label
                                            className="form-check-label text-white"
                                            htmlFor="basic_checkbox_1"
                                          >
                                            Remember my preference
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-center">
                                      <button
                                        type="submit"
                                        className="btn bg-white text-primary btn-block"
                                        disabled={props.showLoading}
                                      >
                                        {props.showLoading ? "Signing in..." : "Sign in"}
                                      </button>
                                    </div>
                                  </form>
                                {/* <div className="new-account mt-2">
                                  <p className="text-white">
                                    Don't have an account?{" "}
                                    <Link className="text-white" to="/page-register">
                                      Sign up
                                    </Link>
                                  </p>
                                </div> */}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
            </div>
        </div>
            
    )
}

const mapStateToProps = (state) => {
    return {
        errorMessage: state.auth.errorMessage,
        successMessage: state.auth.successMessage,
        showLoading: state.auth.showLoading,
    };
};
export default connect(mapStateToProps)(Login);