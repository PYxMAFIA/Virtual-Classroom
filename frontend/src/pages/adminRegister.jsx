import React from "react";
import NAV from "../components/navbar";
import Register from "../components/Register";

const AdminRegister = () => {
    return (
        <>
            <NAV />
            <div style={{ paddingTop: "64px" }}>
                <Register />
            </div>
        </>
    );
};

export default AdminRegister;
