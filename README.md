# Light90 - Optimize Your Morning, Unlock Your Day

Light90 is a web application designed to help you harness the power of morning light to reset your circadian rhythm, boost energy, and improve sleep. It syncs with your WHOOP data to provide personalized timing for your crucial first light exposure.

## Description

The core principle of Light90 is based on scientific findings that suggest viewing sunlight within a specific window after waking (ideally around 90 minutes) can significantly impact your internal biological clock. This application automates the timing by:

1.  Securely authenticating with your WHOOP account.
2.  Fetching your latest wake-up time from your WHOOP sleep data.
3.  Calculating the optimal 90-minute mark for your morning light exposure.
4.  (Future) Sending you a notification to remind you.
5.  Providing a dashboard to view your sleep insights and upcoming light schedule.

## Features

*   **WHOOP Integration**: Securely connects to your WHOOP account using OAuth2.
*   **Personalized Timing**: Calculates the ideal time for morning light exposure based on your actual wake-up times from WHOOP.
*   **Dashboard**: Displays your latest sleep cycle information from WHOOP and your next scheduled Light90 alert.
*   **User Authentication**: Secure login and session management.
*   **Responsive Design**: Built with Chakra UI for a consistent experience across devices.

## Tech Stack

*   **Frontend**: React, TypeScript, Chakra UI, Axios, React Router
*   **Backend**: Node.js, Express.js, Passport.js (for WHOOP OAuth2), Axios, Express Session
*   **Development**: Concurrently (for running frontend and backend together)

## Prerequisites

Before you begin, ensure you have the following installed:

*   [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   A [WHOOP Developer Account](https://developer.whoop.com/) and API credentials (Client ID & Client Secret).

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd light90
    ```

2.  **Install Root Dependencies:**
    These are primarily for running both frontend and backend concurrently.
    ```bash
    npm install
    ```

3.  **Configure Backend:**
    *   Navigate to the backend directory:
        ```bash
        cd backend
        ```
    *   Create a `.env` file by copying `example.env` (if one exists) or creating it manually. Add the following environment variables:
        ```env
        NODE_ENV=development
        PORT=5000
        CLIENT_URL=http://localhost:3000
        REDIRECT_URI=http://localhost:5000/auth/whoop/callback
        SESSION_SECRET=your_strong_random_session_secret_here
        WHOOP_CLIENT_ID=your_whoop_client_id_here
        WHOOP_CLIENT_SECRET=your_whoop_client_secret_here
        ```
        *Replace placeholders with your actual WHOOP credentials and a strong session secret.*
    *   Install backend dependencies:
        ```bash
        npm install
        ```

4.  **Configure Frontend:**
    *   Navigate to the frontend directory:
        ```bash
        cd ../frontend
        ```
    *   Install frontend dependencies:
        ```bash
        npm install
        ```
    *   (Optional) If you plan to use a different backend URL than the default `http://localhost:5000` during development, create a `.env` file in the `frontend` directory with your backend URL:
        ```env
        REACT_APP_BACKEND_URL=http://your-backend-url.com
        ```

5.  **Return to Root Directory:**
    ```bash
    cd ..
    ```

## Running the Application

To start both the backend and frontend servers concurrently for development:

```bash
npm run dev
```

This command will:
*   Start the backend server (typically on `http://localhost:5000`).
*   Start the frontend development server (typically on `http://localhost:3000`).

Open your browser and navigate to `http://localhost:3000` to use the application.

## Project Structure

```
light90/
├── backend/        # Node.js/Express backend code
│   ├── node_modules/
│   ├── index.js    # Main server file
│   ├── package.json
│   └── .env        # Backend environment variables (gitignored)
├── frontend/       # React/TypeScript frontend code
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── hooks/      # Custom React hooks (e.g., useAuth)
│   │   ├── App.tsx     # Main application component
│   │   ├── index.tsx   # React entry point
│   │   └── ...
│   ├── package.json
│   └── .env        # Frontend environment variables (gitignored, optional)
├── node_modules/   # Root node_modules (for concurrently)
├── package.json    # Root package.json for concurrent scripts
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

(Consider adding a license, e.g., MIT License)