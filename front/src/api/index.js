import { API_BASE_URL } from "../config/api";

// import { useState } from "react";
// import { useNavigate } from "react-router-dom";

export const userLogin = async (email,password) => {
    const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`,{
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            email: email,
            password: password
        })
    })
    console.log(response);
    return response.json();
}
