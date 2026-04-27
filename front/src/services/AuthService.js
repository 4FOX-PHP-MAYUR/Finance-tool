import axios from 'axios';
import {
    loginConfirmedAction,
    Logout,
} from '../store/actions/AuthActions';
import { login as nodeLogin } from "./nodeAuthService";

export function signUp(email, password) {
    //axios call
    const postData = {
        email,
        password,
        returnSecureToken: true,
    };
    return axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyD3RPAp3nuETDn9OQimqn_YF6zdzqWITII`,
        postData,
    );
}

export function login(email, password) {
    // Normalize Node backend login response into a shape Redux expects.
    return nodeLogin(email, password).then((tokenDetails) => ({ data: tokenDetails }));
}

export function formatError(error) {
    // `error` can be:
    // - an Error thrown by fetch
    // - an axios error with `response.data`
    // - a backend JSON error object
    const message =
        error?.message ||
        error?.error?.message ||
        error?.errorMessage ||
        error?.msg ||
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.response?.data?.errorMessage ||
        error?.response?.data?.error?.message;

    return message || "Invalid email or password.";
}

export function saveTokenInLocalStorage(tokenDetails) {
    // If backend doesn't return expiry, keep the session as "forever" in the UI layer.
    if (typeof tokenDetails?.expiresIn === "number" && Number.isFinite(tokenDetails.expiresIn)) {
        tokenDetails.expireDate = new Date(Date.now() + tokenDetails.expiresIn * 1000).toISOString();
    } else {
        delete tokenDetails.expireDate;
    }
    localStorage.setItem('userDetails', JSON.stringify(tokenDetails));
}

export function runLogoutTimer(dispatch, timer, navigate) {
    if (!Number.isFinite(timer) || timer <= 0) return;
    setTimeout(() => dispatch(Logout(navigate)), timer);
}

export function checkAutoLogin(dispatch, navigate) {
    const tokenDetailsString = localStorage.getItem('userDetails');
    let tokenDetails = '';
    if (!tokenDetailsString) {
        dispatch(Logout(navigate));
		return;
    }

    tokenDetails = JSON.parse(tokenDetailsString);
    const expireDate = tokenDetails.expireDate ? new Date(tokenDetails.expireDate) : null;
    let todaysDate = new Date();

    if (expireDate && todaysDate > expireDate) {
        dispatch(Logout(navigate));
        return;
    }
		
    dispatch(loginConfirmedAction(tokenDetails));
	
    if (expireDate) {
        const timer = expireDate.getTime() - todaysDate.getTime();
        runLogoutTimer(dispatch, timer, navigate);
    }
}
