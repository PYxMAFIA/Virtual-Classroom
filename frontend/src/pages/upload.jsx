import React from 'react';
import NAV from '../components/navbar';
import UploadForm from '../components/UploadForm';

const Upload = () => {
    return (
        <>
            <NAV />
            <div style={{ paddingTop: "64px" }}>
                <UploadForm />
            </div>
        </>
    );
}

export default Upload;
