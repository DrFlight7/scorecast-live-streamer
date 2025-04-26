import React from "react";

const UserDataDeletion: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">User Data Deletion Request</h1>

        <p className="mb-4 text-gray-700">
          At <strong>StreamCast</strong>, we respect your privacy and are committed to protecting your personal data.
        </p>

        <p className="mb-6 text-gray-700">
          If you would like to request the deletion of your data associated with our application, please follow the instructions below.
        </p>

        <h2 className="text-2xl font-semibold mb-3">How to Request Data Deletion</h2>
        <p className="mb-6 text-gray-700">
          To request the deletion of your data, please send an email to <strong>drflight7@gmail.com</strong> with the subject line <strong>"User Data Deletion Request"</strong>. 
          In your email, please include:
        </p>

        <ul className="list-disc list-inside mb-6 text-gray-700">
          <li>Your full name</li>
          <li>The email address associated with your account</li>
          <li>Any relevant information to help us identify your data</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3">What Happens Next?</h2>
        <p className="mb-6 text-gray-700">
          Once we receive your request, we will verify your identity and proceed to delete your data from our records within 30 days. 
          We will confirm the deletion via email once the process is complete.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Important Notes</h2>
        <ul className="list-disc list-inside mb-6 text-gray-700">
          <li>Some data may be retained as required by law or for legitimate business purposes.</li>
          <li>Deleted data cannot be recovered once the deletion process is completed.</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
        <p className="text-gray-700">
          If you have any questions or need assistance regarding your data, please contact us at <strong>drflight7@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
};

export default UserDataDeletion;
