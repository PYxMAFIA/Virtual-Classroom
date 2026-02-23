import React from "react";
import NAV from "../components/navbar";
import Login from "../components/Login";

const AdminLogin = () => {
    return (
        <>
            <NAV />
            <div style={{ paddingTop: "64px" }}>
                <Login />
            </div>
        </>
    );
};

export default AdminLogin;
