import React from "react";

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl bg-white p-8 rounded-2xl shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center">Privacy Policy</h1>

        <p className="mb-4 text-gray-700"><strong>Effective Date:</strong> April 26, 2025</p>

        <p className="mb-4 text-gray-700">
          <strong>StreamCast</strong> ("we", "our", or "us") operates the <strong>StreamCast</strong> application (the "Service").
        </p>

        <p className="mb-6 text-gray-700">
          This page informs you of our policies regarding the collection, use, and disclosure of personal information when you use our Service.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Information Collection and Use</h2>
        <p className="mb-6 text-gray-700">
          We do not collect, store, or share any personal information from users except as required for the app functionality provided by Facebook's APIs.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Log Data</h2>
        <p className="mb-6 text-gray-700">
          Whenever you use our Service, we may collect data and information (through third-party products) called Log Data. This may include your device IP address, device name, OS version, configuration, and the time and date of usage.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Cookies</h2>
        <p className="mb-6 text-gray-700">
          Our Service does not use cookies explicitly. However, the app may use third-party code and libraries that use cookies to collect information and improve their services.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Service Providers</h2>
        <p className="mb-4 text-gray-700">
          We may employ third-party companies and individuals to:
        </p>
        <ul className="list-disc list-inside mb-6 text-gray-700">
          <li>Facilitate our Service</li>
          <li>Provide the Service on our behalf</li>
          <li>Perform Service-related services</li>
          <li>Assist us in analyzing how our Service is used</li>
        </ul>
        <p className="mb-6 text-gray-700">
          These third parties have access to your Personal Information only to perform these tasks and are obligated not to disclose or use it for any other purpose.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Security</h2>
        <p className="mb-6 text-gray-700">
          We value your trust in providing us your Personal Information, thus we strive to use commercially acceptable means of protecting it. But remember that no method of transmission over the Internet, or method of electronic storage is 100% secure and reliable.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Links to Other Sites</h2>
        <p className="mb-6 text-gray-700">
          Our Service may contain links to other sites. If you click on a third-party link, you will be directed to that site. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites or services.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Changes to This Privacy Policy</h2>
        <p className="mb-6 text-gray-700">
          We may update our Privacy Policy from time to time. Thus, you are advised to review this page periodically for any changes.
        </p>

        <h2 className="text-2xl font-semibold mb-3">Contact Us</h2>
        <p className="text-gray-700">
          If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at <strong>drflight7@gmail.com</strong>.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
