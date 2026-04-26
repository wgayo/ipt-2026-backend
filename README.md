# Node.js + TypeScript + MySQL - Boilerplate API with Email Sign Up, Verification, Authentication & Forgot Password

This project is a TypeScript conversion of the original Node.js + MySQL boilerplate API tutorial by Jason Watmore. It provides a robust foundation for building secure APIs with user management features.

## Features

- **TypeScript Implementation:** Strongly typed codebase for better developer experience and reliability.
- **Email Sign Up and Verification:** Users must verify their email address before they can authenticate.
- **JWT Authentication with Refresh Tokens:** Secure access using short-lived JWTs (15 mins) and long-lived refresh tokens (7 days) stored in HTTP-only cookies.
- **Role-Based Authorization:** Supports `User` and `Admin` roles to restrict access to specific routes.
- **Forgot Password & Reset Password:** Complete flow for users to securely recover their accounts via email.
- **Account Management (CRUD):** Admin users can manage all accounts; regular users can only manage their own.
- **Swagger API Documentation:** Interactive API documentation available at the `/api-docs` route.

## Table of Contents

- [Overview](#overview)
- [JWT Authentication & Refresh Tokens](#jwt-authentication--refresh-tokens)
- [Local Setup Instructions](#local-setup-instructions)
- [Project Structure](#project-structure)
- [Testing the API](#testing-the-api)

---

## Overview

There are no users registered in the boilerplate API by default. To authenticate, you must first register and verify an account. The API automatically sends a verification email upon registration containing a unique token.

**Email Configuration:** SMTP settings must be configured in `config.json`. The project comes pre-configured with Ethereal Email credentials for testing purposes, but you should update these for production.

**Role Assignment:** The very first account registered is automatically assigned the `Admin` role. All subsequent accounts default to the `User` role. Admins have full access to CRUD routes for all accounts, while regular users are restricted to modifying their own profiles.

## JWT Authentication & Refresh Tokens

Authentication utilizes a dual-token system for enhanced security:
1. **JWT Access Token:** Returned on successful login, expires in 15 minutes. Used in the `Authorization: Bearer <token>` header to access secure routes.
2. **Refresh Token:** Expires in 7 days and is sent as an **HTTP Only cookie**. This protects against XSS (Cross-Site Scripting) attacks since JavaScript cannot access the cookie. The refresh token is used exclusively at the `/accounts/refresh-token` endpoint to generate new JWTs, which also mitigates CSRF (Cross-Site Request Forgery).

### Refresh Token Rotation
Every time a refresh token is used to generate a new JWT, it is immediately revoked and replaced with a new one. This reduces the lifetime of refresh tokens and ensures that if a token is compromised, its validity is minimized. An audit trail of revoked and replaced tokens is maintained in the MySQL database.

---

## Local Setup Instructions

### Prerequisites
- Node.js and NPM installed
- MySQL Server installed and running

### 1. Clone the repository and install dependencies
```bash
# Clone the repository (if you haven't already)
# git clone <your-repo-url>
cd node-mysql-api

# Install dependencies
npm install
```

### 2. Configure the Database
Open the `config.json` file in the root directory and update the `database` object with your local MySQL credentials:

```json
"database": {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "your_mysql_password",
    "database": "node_mysql_api"
}
```
*Note: The API uses Sequelize, which will automatically create the database if it doesn't exist and sync the tables on startup.*

### 3. Start the API
You can run the API using `ts-node` directly or via nodemon for development:

```bash
# Run for development (auto-reloads on file changes)
npm run start:dev

# OR run normally
npm start
```

You should see the message: `Server listening on port 4000`.

### 4. View API Documentation
Navigate to [http://localhost:4000/api-docs](http://localhost:4000/api-docs) in your browser to view and interact with the Swagger API documentation.

---

## Project Structure

The project has been converted from CommonJS (`require`) to ES Modules (`import/export`) and utilizes TypeScript for strong typing.

- `server.ts`: The entry point of the application. It configures Express, binds middleware, and registers the API routes.
- `config.json`: Contains environment variables, database credentials, JWT secret, and SMTP configuration.
- `tsconfig.json`: TypeScript compiler configuration.
- `_helpers/`: Contains utility functions and configurations.
  - `db.ts`: Initializes the MySQL database connection using Sequelize and binds the models.
  - `role.ts`: Defines the available user roles (`Admin`, `User`).
  - `send-email.ts`: Wrapper for Nodemailer to send emails.
  - `swagger.ts`: Configures the Swagger UI Express middleware.
- `_middleware/`: Contains Express middleware functions.
  - `authorize.ts`: Validates JWT tokens and checks user roles against route requirements.
  - `error-handler.ts`: Global error handling middleware.
  - `validate-request.ts`: Uses Joi to validate incoming request bodies against schemas defined in the controllers.
- `accounts/`: The core domain module containing the business logic for users.
  - `account.model.ts`: Sequelize model definition for the Account table.
  - `refresh-token.model.ts`: Sequelize model definition for the RefreshToken table.
  - `account.service.ts`: Contains all the core business logic (authentication, registration, token management).
  - `accounts.controller.ts`: Defines the Express routes, request validation schemas (Joi), and maps routes to service functions.

---

## Testing the API

The easiest way to test the API is using the built-in Swagger documentation at `http://localhost:4000/api-docs`.

### Registration Flow:
1. Go to the **POST /accounts/register** endpoint.
2. Click "Try it out" and enter your details. Execute the request.
3. Because Ethereal Email is configured, check your terminal output or Ethereal inbox for the verification token.
4. Go to **POST /accounts/verify-email** and provide the token to activate the account.

### Authentication Flow:
1. Go to **POST /accounts/authenticate**.
2. Enter the email and password you registered with.
3. The response will contain your details and a `jwtToken`. (The refresh token is set automatically in your browser cookies).
4. Copy the `jwtToken`.
5. Scroll to the top of the Swagger UI, click the **Authorize** button, and paste the token (no need to add 'Bearer ' prefix, Swagger does this for you).
6. You can now access secure routes like **GET /accounts**.