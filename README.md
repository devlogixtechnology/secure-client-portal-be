# Client Portal System - Comprehensive Documentation

## Project Overview
Secure, role-based collaboration platform for Albroe Accountants enabling confidential communication, document exchange, and task tracking between Administrators, Employees, and Clients with strict access control and data isolation.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Technology Stack](#technology-stack)
- [Database Schema (MongoDB/Mongoose)](#database-schema-mongodbmongoose)
- [API Contract](#api-contract)
- [Project Structure](#project-structure)
- [Setup Instructions](#setup-instructions)
- [Security Features](#security-features)
- [Development Workflow](#development-workflow)

---

## Architecture Overview

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                            │
│        (Web App - FE-A, Marketing Site - FE-B)              │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/TLS 1.3
┌──────────────────────▼──────────────────────────────────────┐
│              API Gateway / Load Balancer                    │
│         (Rate Limiting, SSL Termination, Routing)            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Application Server Layer                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API Endpoints                      │  │
│  │  (Authentication, Authorization, Business Logic)      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Security Middleware                      │  │
│  │  (RBAC, Input Validation, CSRF Protection)           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service Layer                            │  │
│  │  (UserService, FileService, ChatService, etc.)       │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼──────┐ ┌─────▼──────┐ ┌────▼─────┐
│   MongoDB    │ │   Redis    │ │  AWS S3  │
│   Database   │ │   Cache     │ │  Storage  │
└──────────────┘ └────────────┘ └──────────┘
```

### User Roles
- **SUPER_ADMIN**: Highest privilege, full system access
- **ADMIN**: Administrative access to manage users and assignments
- **EMPLOYEE**: Relationship Manager, access to assigned clients only
- **CLIENT**: External customer, least privileged, access to own data only

---

## Technology Stack

### Backend (BE-A)
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: MongoDB 6+
- **ORM**: Mongoose 7.x
- **Cache**: Redis 7+
- **Authentication**: JWT + bcrypt password hashing
- **MFA**: TOTP (Time-based One-Time Password)

### Security Libraries
- **Helmet**: Security headers
- **Express Rate Limit**: Rate limiting
- **CSRF Protection**: csrf-csrf
- **Input Validation**: Joi
- **File Validation**: file-type (magic bytes inspection)

---

## Database Schema (MongoDB/Mongoose)

### User Model
```typescript
{
  _id: ObjectId,
  email: String (unique, required),
  password: String (bcrypt hash, required),
  role: Enum ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'],
  status: Enum ['ACTIVE', 'INACTIVE'],
  firstName: String,
  lastName: String,
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date,
  mfaEnabled: Boolean,
  mfaSecret: String,
  recoveryCodes: [String]
}
```

**Indexes**: email, role, status

### ClientProfile Model
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User, unique, required),
  businessName: String (required),
  contactPerson: String (required),
  phone: String (required),
  assignedEmployeeId: ObjectId (ref: User),
  credentialsSent: Boolean,
  credentialsSentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: userId, assignedEmployeeId, businessName

### EmployeeAssignment Model
```typescript
{
  _id: ObjectId,
  employeeId: ObjectId (ref: User, required),
  clientId: ObjectId (ref: User, required),
  assignedAt: Date,
  unassignedAt: Date,
  assignedBy: ObjectId (ref: User, required),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: employeeId, clientId, isActive, assignedAt, unassignedAt

### FileRecord Model
```typescript
{
  _id: ObjectId,
  clientId: ObjectId (ref: User, required),
  uploadedBy: ObjectId (ref: User, required),
  originalFilename: String (required),
  storedFilename: String (unique, required),
  filePath: String (required),
  fileSize: Number (required),
  fileType: String (required),
  fileHash: String (required),
  uploadPurpose: Enum ['DOCUMENT_REQUEST', 'CHAT_ATTACHMENT', 'DIRECT_UPLOAD'],
  associatedRequestId: ObjectId (unique, sparse),
  associatedMessageId: ObjectId (unique, sparse),
  isArchived: Boolean,
  archivedAt: Date,
  archivedBy: ObjectId (ref: User),
  virusScanStatus: Enum ['PENDING', 'CLEAN', 'INFECTED', 'ERROR'],
  createdAt: Date
}
```

**Indexes**: clientId, uploadedBy, uploadPurpose, isArchived, createdAt

### FileRequest Model
```typescript
{
  _id: ObjectId,
  clientId: ObjectId (ref: User, required),
  requestedBy: ObjectId (ref: User, required),
  label: String (required),
  description: String,
  status: Enum ['PENDING', 'UNACKNOWLEDGED', 'FULFILLED', 'REJECTED'],
  submittedFileId: ObjectId (unique, sparse),
  acknowledgedBy: ObjectId (ref: User),
  acknowledgedAt: Date,
  rejectionReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**: clientId, requestedBy, status, createdAt

### ChatThread Model
```typescript
{
  _id: ObjectId,
  participant1Id: ObjectId (ref: User, required),
  participant2Id: ObjectId (ref: User, required),
  threadType: Enum ['ADMIN_CLIENT', 'ADMIN_EMPLOYEE', 'EMPLOYEE_CLIENT'],
  createdAt: Date,
  updatedAt: Date,
  isActive: Boolean
}
```

**Indexes**: participant1Id + participant2Id (unique), threadType, updatedAt

### Message Model
```typescript
{
  _id: ObjectId,
  threadId: ObjectId (ref: ChatThread, required),
  senderId: ObjectId (ref: User, required),
  content: String (required),
  hasAttachment: Boolean,
  attachmentFileId: ObjectId (unique, sparse),
  createdAt: Date,
  isRead: Boolean,
  readAt: Date
}
```

**Indexes**: threadId, senderId, createdAt, isRead + createdAt

### AuditLog Model
```typescript
{
  _id: ObjectId,
  actorId: ObjectId (ref: User, required),
  actorType: Enum ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'],
  tenantId: ObjectId (ref: User),
  targetObjectId: ObjectId,
  targetObjectType: String,
  action: String (required),
  previousValue: Mixed,
  newValue: Mixed,
  authorizationResult: Enum ['ALLOWED', 'DENIED'],
  requestId: String,
  sourceIp: String,
  userAgent: String,
  timestamp: Date,
  service: String
}
```

**Indexes**: actorId, tenantId, action, timestamp, authorizationResult

---

## API Contract

### Base URL
- Development: `http://localhost:3000/v1`
### Authentication
All endpoints (except public auth endpoints) require Bearer token authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

### Standard HTTP Status Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request payload
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Valid authentication but insufficient permissions
- `404 Not Found` - Resource not found (or unauthorized access hidden as 404)
- `422 Unprocessable Entity` - Validation error or business logic violation
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Standard Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

---

## 1. Authentication Endpoints

### 1.1 Login
**Endpoint**: `POST /auth/login`
**Authentication**: None (Public)
**Rate Limit**: 5 requests per minute per IP

**Request Payload**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mfa_code": "123456"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "objectId",
      "email": "user@example.com",
      "role": "CLIENT",
      "firstName": "John",
      "lastName": "Doe",
      "mfaEnabled": false
    },
    "expires_in": 900
  }
}
```

### 1.2 Logout
**Endpoint**: `POST /auth/logout`
**Authentication**: Required (Any Role)
**Rate Limit**: 10 requests per minute

**Success Response (204)**: No content

### 1.3 Refresh Token
**Endpoint**: `POST /auth/refresh`
**Authentication**: None (uses refresh token from cookie)
**Rate Limit**: 10 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900
  }
}
```

### 1.4 Request Password Reset
**Endpoint**: `POST /auth/password-reset/request`
**Authentication**: None (Public)
**Rate Limit**: 3 requests per hour per email

**Request Payload**:
```json
{
  "email": "user@example.com"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "If the email exists, a reset link has been sent"
}
```

### 1.5 Reset Password
**Endpoint**: `POST /auth/password-reset/confirm`
**Authentication**: None (Public)
**Rate Limit**: 5 requests per hour

**Request Payload**:
```json
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePassword123!"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Password has been reset successfully"
}
```

---

## 2. User Management Endpoints (Admin Only)

### 2.1 Create Employee Account
**Endpoint**: `POST /admin/users/employees`
**Authentication**: Required (Admin Only)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "email": "employee@albroeaccountants.com",
  "password": "SecurePassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "role": "EMPLOYEE"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "email": "employee@albroeaccountants.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "createdAt": "2026-09-02T10:00:00Z"
  }
}
```

**Error Responses**:
- `422` - Email not @albroeaccountants.com domain
- `409` - Email already exists
- `422` - Validation error

### 2.2 Create Client Account
**Endpoint**: `POST /admin/users/clients`
**Authentication**: Required (Admin Only)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "email": "client@company.com",
  "password": "SecurePassword123!",
  "businessName": "Acme Corporation",
  "contactPerson": "John Doe",
  "phone": "+1234567890",
  "assignedEmployeeId": "employeeObjectId"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "email": "client@company.com",
    "businessName": "Acme Corporation",
    "contactPerson": "John Doe",
    "phone": "+1234567890",
    "role": "CLIENT",
    "status": "ACTIVE",
    "assignedEmployeeId": "employeeObjectId",
    "credentialsSent": false,
    "createdAt": "2026-09-02T10:00:00Z"
  }
}
```

### 2.3 List All Users
**Endpoint**: `GET /admin/users`
**Authentication**: Required (Admin Only)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `role` (optional): Filter by role
- `status` (optional): Filter by status
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "objectId",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "CLIENT",
        "status": "ACTIVE",
        "createdAt": "2026-09-02T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

### 2.4 Get User Details
**Endpoint**: `GET /admin/users/{user_id}`
**Authentication**: Required (Admin Only)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CLIENT",
    "status": "ACTIVE",
    "createdAt": "2026-09-02T10:00:00Z",
    "lastLogin": "2026-09-02T09:30:00Z",
    "mfaEnabled": false,
    "clientProfile": {
      "businessName": "Acme Corporation",
      "contactPerson": "John Doe",
      "phone": "+1234567890",
      "assignedEmployeeId": "employeeObjectId",
      "credentialsSent": true,
      "credentialsSentAt": "2026-09-02T10:05:00Z"
    }
  }
}
```

### 2.5 Update User
**Endpoint**: `PATCH /admin/users/{user_id}`
**Authentication**: Required (Admin Only)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "status": "INACTIVE"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": "CLIENT",
    "status": "INACTIVE",
    "updatedAt": "2026-09-02T11:00:00Z"
  }
}
```

### 2.6 Deactivate User (Soft Delete)
**Endpoint**: `POST /admin/users/{user_id}/deactivate`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "User has been deactivated",
  "data": {
    "id": "objectId",
    "status": "INACTIVE",
    "deactivatedAt": "2026-09-02T11:00:00Z"
  }
}
```

### 2.7 Reactivate User
**Endpoint**: `POST /admin/users/{user_id}/reactivate`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "User has been reactivated",
  "data": {
    "id": "objectId",
    "status": "ACTIVE",
    "reactivatedAt": "2026-09-02T11:00:00Z"
  }
}
```

### 2.8 Send Client Credentials
**Endpoint**: `POST /admin/users/{user_id}/send-credentials`
**Authentication**: Required (Admin Only)
**Rate Limit**: 5 requests per hour per user

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Login credentials have been sent to the client",
  "data": {
    "sentAt": "2026-09-02T11:00:00Z"
  }
}
```

---

## 3. Employee Assignment Endpoints (Admin Only)

### 3.1 Assign Client to Employee
**Endpoint**: `POST /admin/assignments`
**Authentication**: Required (Admin Only)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "employeeId": "employeeObjectId",
  "clientId": "clientObjectId"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "assignmentObjectId",
    "employeeId": "employeeObjectId",
    "clientId": "clientObjectId",
    "assignedAt": "2026-09-02T10:00:00Z",
    "assignedBy": "adminObjectId",
    "isActive": true
  }
}
```

### 3.2 Reassign Client to Different Employee
**Endpoint**: `PUT /admin/assignments/{client_id}`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Request Payload**:
```json
{
  "newEmployeeId": "newEmployeeObjectId"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Client has been reassigned",
  "data": {
    "oldAssignment": {
      "id": "oldAssignmentObjectId",
      "unassignedAt": "2026-09-02T11:00:00Z"
    },
    "newAssignment": {
      "id": "newAssignmentObjectId",
      "employeeId": "newEmployeeObjectId",
      "assignedAt": "2026-09-02T11:00:00Z"
    }
  }
}
```

### 3.3 List Employee Assignments
**Endpoint**: `GET /admin/assignments`
**Authentication**: Required (Admin Only)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `employeeId` (optional): Filter by employee
- `clientId` (optional): Filter by client
- `isActive` (optional): Filter by active status

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "assignments": [
      {
        "id": "assignmentObjectId",
        "employeeId": "employeeObjectId",
        "employeeName": "Jane Smith",
        "clientId": "clientObjectId",
        "clientName": "Acme Corporation",
        "assignedAt": "2026-09-02T10:00:00Z",
        "isActive": true
      }
    ]
  }
}
```

### 3.4 Remove Client Assignment
**Endpoint**: `DELETE /admin/assignments/{client_id}`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Client assignment has been removed",
  "data": {
    "unassignedAt": "2026-09-02T11:00:00Z"
  }
}
```

---

## 4. Client Endpoints

### 4.1 Get My Profile
**Endpoint**: `GET /clients/profile`
**Authentication**: Required (Client Only)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "email": "client@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "clientProfile": {
      "businessName": "Acme Corporation",
      "contactPerson": "John Doe",
      "phone": "+1234567890",
      "assignedEmployee": {
        "id": "employeeObjectId",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@albroeaccountants.com"
      }
    }
  }
}
```

### 4.2 Update My Profile
**Endpoint**: `PATCH /clients/profile`
**Authentication**: Required (Client Only)
**Rate Limit**: 10 requests per hour

**Request Payload**:
```json
{
  "phone": "+1987654321"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "objectId",
    "phone": "+1987654321",
    "updatedAt": "2026-09-02T11:00:00Z"
  }
}
```

---

## 5. Employee Endpoints

### 5.1 List My Assigned Clients
**Endpoint**: `GET /employees/clients`
**Authentication**: Required (Employee Only)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "clientObjectId",
        "email": "client@company.com",
        "businessName": "Acme Corporation",
        "contactPerson": "John Doe",
        "phone": "+1234567890",
        "assignedAt": "2026-09-02T10:00:00Z"
      }
    ]
  }
}
```

### 5.2 Get Client Details
**Endpoint**: `GET /employees/clients/{client_id}`
**Authentication**: Required (Employee Only)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": "clientObjectId",
    "email": "client@company.com",
    "businessName": "Acme Corporation",
    "contactPerson": "John Doe",
    "phone": "+1234567890",
    "assignedAt": "2026-09-02T10:00:00Z",
    "filesCount": 15,
    "requestsCount": 3
  }
}
```

---

## 6. File Management Endpoints

### 6.1 Upload File
**Endpoint**: `POST /files/upload`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 10 requests per minute

**Request**: `multipart/form-data`
- `file`: File (max 25MB)
- `clientId`: Client ObjectId (required for Admin/Employee)
- `purpose`: Upload purpose (DOCUMENT_REQUEST, CHAT_ATTACHMENT, DIRECT_UPLOAD)
- `requestId`: Request ObjectId (if purpose is DOCUMENT_REQUEST)
- `messageId`: Message ObjectId (if purpose is CHAT_ATTACHMENT)

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "fileObjectId",
    "originalFilename": "document.pdf",
    "fileSize": 1024000,
    "fileType": "application/pdf",
    "uploadPurpose": "DIRECT_UPLOAD",
    "clientId": "clientObjectId",
    "uploadedBy": "userObjectId",
    "createdAt": "2026-09-02T10:00:00Z",
    "virusScanStatus": "PENDING"
  }
}
```

### 6.2 Download File
**Endpoint**: `GET /files/{file_id}/download`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Success Response (200)**: Binary file stream with headers

### 6.3 List Client Files
**Endpoint**: `GET /files`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `clientId` (required for Admin/Employee, optional for Client)
- `isArchived` (optional): Filter by archived status
- `purpose` (optional): Filter by upload purpose
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "files": [
      {
        "id": "fileObjectId",
        "originalFilename": "document.pdf",
        "fileSize": 1024000,
        "fileType": "application/pdf",
        "uploadPurpose": "DIRECT_UPLOAD",
        "uploadedBy": "userObjectId",
        "uploaderName": "John Doe",
        "createdAt": "2026-09-02T10:00:00Z",
        "isArchived": false,
        "virusScanStatus": "CLEAN"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1
    }
  }
}
```

### 6.4 Archive File (Admin Only)
**Endpoint**: `POST /files/{file_id}/archive`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "File has been archived",
  "data": {
    "id": "fileObjectId",
    "isArchived": true,
    "archivedAt": "2026-09-02T11:00:00Z"
  }
}
```

### 6.5 Unarchive File (Admin Only)
**Endpoint**: `POST /files/{file_id}/unarchive`
**Authentication**: Required (Admin Only)
**Rate Limit**: 10 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "File has been unarchived",
  "data": {
    "id": "fileObjectId",
    "isArchived": false,
    "unarchivedAt": "2026-09-02T11:00:00Z"
  }
}
```

---

## 7. File Request Endpoints

### 7.1 Create File Request
**Endpoint**: `POST /requests`
**Authentication**: Required (Admin/Employee)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "clientId": "clientObjectId",
  "label": "Q1 2025 Bank Statement",
  "description": "Please upload the bank statement for Q1 2025"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "requestObjectId",
    "clientId": "clientObjectId",
    "requestedBy": "userObjectId",
    "label": "Q1 2025 Bank Statement",
    "description": "Please upload the bank statement for Q1 2025",
    "status": "PENDING",
    "createdAt": "2026-09-02T10:00:00Z"
  }
}
```

### 7.2 List File Requests
**Endpoint**: `GET /requests`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `clientId` (required for Admin/Employee, optional for Client)
- `status` (optional): Filter by status
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 20, max 100)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "requestObjectId",
        "clientId": "clientObjectId",
        "clientName": "Acme Corporation",
        "requestedBy": "userObjectId",
        "requestedByName": "Jane Smith",
        "label": "Q1 2025 Bank Statement",
        "description": "Please upload the bank statement for Q1 2025",
        "status": "PENDING",
        "createdAt": "2026-09-02T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### 7.3 Submit File for Request
**Endpoint**: `POST /requests/{request_id}/submit`
**Authentication**: Required (Client Only)
**Rate Limit**: 10 requests per minute

**Request**: `multipart/form-data`
- `file`: File (max 25MB)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "File has been submitted for the request",
  "data": {
    "requestId": "requestObjectId",
    "fileId": "fileObjectId",
    "status": "UNACKNOWLEDGED",
    "submittedAt": "2026-09-02T10:00:00Z"
  }
}
```

### 7.4 Acknowledge Request (Admin/Employee)
**Endpoint**: `POST /requests/{request_id}/acknowledge`
**Authentication**: Required (Admin/Employee)
**Rate Limit**: 20 requests per hour

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Request has been acknowledged and marked as fulfilled",
  "data": {
    "id": "requestObjectId",
    "status": "FULFILLED",
    "acknowledgedBy": "userObjectId",
    "acknowledgedAt": "2026-09-02T10:00:00Z"
  }
}
```

### 7.5 Reject Request (Admin/Employee)
**Endpoint**: `POST /requests/{request_id}/reject`
**Authentication**: Required (Admin/Employee)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "reason": "The document is incomplete. Please include all pages."
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Request has been rejected",
  "data": {
    "id": "requestObjectId",
    "status": "REJECTED",
    "rejectionReason": "The document is incomplete. Please include all pages.",
    "acknowledgedBy": "userObjectId",
    "acknowledgedAt": "2026-09-02T10:00:00Z"
  }
}
```

---

## 8. Chat/Communication Endpoints

### 8.1 Create Chat Thread
**Endpoint**: `POST /chat/threads`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 20 requests per hour

**Request Payload**:
```json
{
  "participantId": "userObjectId"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "threadObjectId",
    "participant1Id": "currentUserObjectId",
    "participant2Id": "userObjectId",
    "threadType": "EMPLOYEE_CLIENT",
    "createdAt": "2026-09-02T10:00:00Z"
  }
}
```

### 8.2 List Chat Threads
**Endpoint**: `GET /chat/threads`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "id": "threadObjectId",
        "threadType": "EMPLOYEE_CLIENT",
        "otherParticipant": {
          "id": "userObjectId",
          "name": "John Doe",
          "role": "CLIENT"
        },
        "lastMessage": {
          "content": "Hello, how can I help you?",
          "createdAt": "2026-09-02T10:00:00Z",
          "senderId": "userObjectId"
        },
        "unreadCount": 2,
        "updatedAt": "2026-09-02T10:00:00Z"
      }
    ]
  }
}
```

### 8.3 Get Chat Thread Messages
**Endpoint**: `GET /chat/threads/{thread_id}/messages`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 50, max 100)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "messageObjectId",
        "threadId": "threadObjectId",
        "senderId": "userObjectId",
        "senderName": "John Doe",
        "content": "Hello, how can I help you?",
        "hasAttachment": false,
        "attachment": null,
        "createdAt": "2026-09-02T10:00:00Z",
        "isRead": true,
        "readAt": "2026-09-02T10:01:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1
    }
  }
}
```

### 8.4 Send Message
**Endpoint**: `POST /chat/threads/{thread_id}/messages`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Request Payload**:
```json
{
  "content": "Hello, I have a question about my documents."
}
```

**Or with file attachment**:
```json
{
  "content": "Here is the document you requested.",
  "attachmentFileId": "fileObjectId"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": "messageObjectId",
    "threadId": "threadObjectId",
    "senderId": "currentUserObjectId",
    "content": "Hello, I have a question about my documents.",
    "hasAttachment": false,
    "attachment": null,
    "createdAt": "2026-09-02T10:00:00Z",
    "isRead": false
  }
}
```

### 8.5 Mark Messages as Read
**Endpoint**: `POST /chat/threads/{thread_id}/read`
**Authentication**: Required (Admin/Employee/Client)
**Rate Limit**: 30 requests per minute

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Messages have been marked as read",
  "data": {
    "threadId": "threadObjectId",
    "readCount": 5,
    "readAt": "2026-09-02T10:00:00Z"
  }
}
```

---

## 9. Marketing Contact Form Endpoint (FE-B)

### 9.1 Submit Contact Form
**Endpoint**: `POST /public/contact`
**Authentication**: None (Public)
**Rate Limit**: 5 requests per hour per IP

**Request Payload**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "Acme Corporation",
  "phone": "+1234567890",
  "message": "I'm interested in learning more about your services."
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Thank you for your inquiry. We will get back to you soon."
}
```

**Error Responses**:
- `422` - Validation error
- `429` - Rate limit exceeded

---

## 10. Audit Log Endpoints (Admin Only)

### 10.1 List Audit Logs
**Endpoint**: `GET /admin/audit-logs`
**Authentication**: Required (Admin Only)
**Rate Limit**: 30 requests per minute

**Query Parameters**:
- `actorId` (optional): Filter by actor
- `action` (optional): Filter by action type
- `authorizationResult` (optional): Filter by result
- `startDate` (optional): Filter by start date (ISO 8601)
- `endDate` (optional): Filter by end date (ISO 8601)
- `page` (optional): Page number (default 1)
- `limit` (optional): Items per page (default 50, max 100)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "logObjectId",
        "actorId": "userObjectId",
        "actorName": "John Doe",
        "actorType": "ADMIN",
        "tenantId": "clientObjectId",
        "targetObjectId": "targetObjectId",
        "targetObjectType": "FileRecord",
        "action": "file.upload",
        "previousValue": null,
        "newValue": {
          "filename": "document.pdf",
          "size": 1024000
        },
        "authorizationResult": "ALLOWED",
        "requestId": "req_123456",
        "sourceIp": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2026-09-02T10:00:00Z",
        "service": "file-service"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

---

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # MongoDB connection
│   │   ├── redis.ts      # Redis connection
│   │   ├── storage.ts    # S3/storage configuration
│   │   ├── auth.ts       # JWT/auth configuration
│   │   └── index.ts      # Central config export
│   ├── controllers/      # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── file.controller.ts
│   │   ├── request.controller.ts
│   │   ├── chat.controller.ts
│   │   ├── audit.controller.ts
│   │   └── contact.controller.ts
│   ├── middleware/       # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logger.middleware.ts
│   ├── models/          # Mongoose models
│   │   ├── User.ts
│   │   ├── ClientProfile.ts
│   │   ├── EmployeeAssignment.ts
│   │   ├── FileRecord.ts
│   │   ├── FileRequest.ts
│   │   ├── ChatThread.ts
│   │   ├── Message.ts
│   │   └── AuditLog.ts
│   ├── routes/          # API route definitions
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── file.routes.ts
│   │   ├── request.routes.ts
│   │   ├── chat.routes.ts
│   │   ├── audit.routes.ts
│   │   └── contact.routes.ts
│   ├── services/        # Business logic layer
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── file.service.ts
│   │   ├── request.service.ts
│   │   ├── chat.service.ts
│   │   ├── audit.service.ts
│   │   └── contact.service.ts
│   ├── utils/           # Utility functions
│   │   ├── password.ts   # Password hashing
│   │   ├── jwt.ts        # JWT token management
│   │   ├── mfa.ts        # MFA functions
│   │   ├── file.ts       # File validation
│   │   ├── logger.ts     # Logging utility
│   │   └── errors.ts     # Custom error classes
│   ├── types/           # TypeScript type definitions
│   │   ├── express.d.ts  # Express extensions
│   │   ├── user.types.ts
│   │   ├── file.types.ts
│   │   └── api.types.ts
│   ├── database/        # Database setup
│   │   ├── connection.ts # MongoDB connection
│   │   └── seed.ts       # Database seeding
│   └── app.ts           # Express app setup
├── tests/
│   ├── unit/            # Unit tests
│   │   ├── services/
│   │   ├── utils/
│   │   └── middleware/
│   └── integration/     # Integration tests
│       └── api/
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md            # This file
```

---

## Setup Instructions

### Prerequisites
- Node.js 18+ LTS
- MongoDB 6+
- Redis 7+ (optional, for caching)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up MongoDB**
```bash
# Make sure MongoDB is running
# On macOS: brew services start mongodb-community
# On Ubuntu: sudo systemctl start mongod
# On Windows: Start MongoDB service
```

5. **Seed initial data (optional)**
```bash
npm run db:seed
```

6. **Start the development server**
```bash
npm run dev
```

### Environment Variables

```env
# Application Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/client_portal
MONGODB_DB_NAME=client_portal

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-key-change-this-in-production
REFRESH_TOKEN_EXPIRY=7d

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
S3_BUCKET=client-portal-uploads
S3_ARCHIVE_BUCKET=client-portal-archive

# Security Configuration
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=5
AUTH_RATE_LIMIT_WINDOW_MS=60000

# File Upload Configuration
MAX_FILE_SIZE=25165824
ALLOWED_FILE_TYPES=pdf,docx,xlsx,jpg,jpeg,png

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./logs

# CORS Configuration
CORS_ORIGIN=http://localhost:3001

# MFA Configuration
MFA_ISSUER=Albroe Client Portal
MFA_DIGITS=6
MFA_PERIOD=30

# Security Headers
ENABLE_HELMET=true
ENABLE_CSP=true

# Session Configuration
SESSION_TIMEOUT_MS=900000
ABSOLUTE_SESSION_TIMEOUT_MS=28800000
```

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Database
npm run db:seed          # Seed database with initial data

# Testing
npm run test             # Run all tests
npm run test:unit        # Run unit tests
npm run test:integration # Run integration tests
npm run test:coverage    # Run tests with coverage

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier
```

---

## Security Features

### Authentication
- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Short-lived access tokens (15 minutes)
- **Refresh Tokens**: HttpOnly cookies with 7-day expiry
- **MFA Support**: TOTP (Google Authenticator, etc.)
- **Rate Limiting**: Protection against brute force attacks

### Authorization
- **Server-Side RBAC**: Role-based access control enforced at API layer
- **Object-Level Authorization**: User can only access assigned resources
- **Employee Domain Restriction**: @albroeaccountants.com validation
- **Data Isolation**: Strict client data separation

### File Security
- **Magic Bytes Validation**: File type inspection beyond extensions
- **UUID Filenames**: Server-generated names to prevent path traversal
- **Virus Scanning**: ClamAV integration before file accessibility
- **Size Limits**: 25MB maximum file size
- **S3 Security**: Isolated buckets with proper IAM policies

### Audit Logging
- **Comprehensive Logging**: All security events logged
- **Immutable Records**: Append-only audit trail
- **Admin Access**: Only administrators can view audit logs
- **Correlation IDs**: Request tracing across services

---

## Development Workflow

### Code Quality Standards
- **TypeScript**: Strict mode enabled
- **Linting**: ESLint with strict rules
- **Formatting**: Prettier for consistent formatting
- **Commit Conventions**: Conventional Commits

### Testing Strategy
- **Unit Tests**: Service layer and utilities
- **Integration Tests**: API endpoints and database
- **Security Tests**: Authorization and input validation
- **Coverage Target**: Minimum 80%

### Git Workflow
1. Create feature branch from main
2. Implement changes with tests
3. Run linting and tests
4. Create pull request
5. Code review and approval
6. Merge to main

---

## Role-Based Access Control Matrix

| Endpoint | SUPER_ADMIN | ADMIN | EMPLOYEE | CLIENT |
|----------|-------------|-------|----------|--------|
| `/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `/auth/logout` | ✅ | ✅ | ✅ | ✅ |
| `/admin/users/*` | ✅ | ✅ | ❌ | ❌ |
| `/admin/assignments/*` | ✅ | ✅ | ❌ | ❌ |
| `/admin/audit-logs/*` | ✅ | ✅ | ❌ | ❌ |
| `/clients/profile` | ❌ | ❌ | ❌ | ✅ |
| `/employees/clients/*` | ❌ | ❌ | ✅ | ❌ |
| `/files/upload` | ✅ | ✅ | ✅ | ✅ |
| `/files/{file_id}/download` | ✅ | ✅ | ✅ | ✅ |
| `/requests` | ✅ | ✅ | ✅ | ✅ |
| `/requests/{request_id}/submit` | ❌ | ❌ | ❌ | ✅ |
| `/requests/{request_id}/acknowledge` | ✅ | ✅ | ✅ | ❌ |
| `/chat/threads` | ✅ | ✅ | ✅ | ✅ |
| `/public/contact` | ✅ | ✅ | ✅ | ✅ |

---

## Important Notes

### Email/SMTP Not Included
As per current scope, email notification functionality is NOT included in this backend implementation. SMTP integration will be handled in a separate phase.

### Employee Domain Restriction
Employee account creation is restricted to @albroeaccountants.com domain. This validation is enforced server-side, not just frontend.

### Data Isolation
- Employees can only access their assigned clients
- Clients can only access their own data
- Admins have full access to all data
- All authorization checks are server-side

### Soft Deletes
User deactivation uses soft delete pattern (status = INACTIVE) to preserve data for audit and compliance purposes.

---

## Support and Documentation

For technical support or questions:
- Review this README for API contracts and setup
- Check Mongoose model definitions in `backend/src/models/`
- Refer to the SRS document for detailed requirements
- Contact Backend Squad A for backend-specific issues

---


## Version

Current Version: 1.0.0
API Version: v1