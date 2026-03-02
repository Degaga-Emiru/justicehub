# ⚖️ Justice Hub

## 🌍 Overview

**Justice Hub** is a modern digital legal case management platform designed to simplify and digitize legal service operations. It provides a centralized and secure environment where **Clients, Lawyers, and Administrators** can efficiently manage cases, documents, payments, and legal workflows.

The platform enhances transparency, reduces paperwork, and strengthens collaboration within the justice ecosystem through a scalable RESTful architecture.

---

## 🚀 Core Features

### 🔐 Secure Authentication & Authorization

- Role-based access control (**Admin, Lawyer, Client**)
- JWT-based authentication
- Secure password hashing
- Custom user model
- Token refresh & access control
- Account verification (OTP support)

---

### 📂 Case Management

- Create, assign, and manage legal cases
- Case status tracking:
  - Pending
  - Active
  - Under Review
  - Resolved
  - Closed
- Workflow-based progression
- Case history tracking

---

### 📄 Document Management

- Secure document uploads
- Case-linked file storage
- Role-based document access
- Organized retrieval system
- Downloadable case documents (PDF support)

---
## 📅 Hearing Scheduling

- Schedule court hearings with date & time
- Assign judges and involved parties
- Track hearing status (Scheduled, Postponed, Completed)
- Send automated notifications to participants
- Maintain hearing history per case

---

## 🏛️ Decision Management

- Create and draft judicial decisions
- Review and finalize decisions
- Publish official decisions
- Status transitions:
  - Draft → Finalized → Published → Resolved/Closed
- Lock editing after publishing
- Download decision as PDF
- Decision history tracking

---

## ✍️ Digital Signature

- Secure digital signing of decisions
- Judge-authorized electronic approval
- Prevent modification after signature
- Signature validation for authenticity
- Ensures legal integrity and non-repudiation

---
### 💳 Payment Management

- Case-based payment tracking
- Client payment records
- Service fee management
- Payment status monitoring:
  - Pending
  - Paid
  - Failed
- Integration-ready architecture (Stripe / Chapa / Telebirr compatible)

---

### 📊 Audit Logs & Activity Tracking

- Complete system activity logging
- Track:
  - User actions
  - Case updates
  - Status changes
  - Document uploads
- Admin-level audit visibility
- Transparent accountability system

---

### 💬 Communication & Notifications

- Case-based notifications
- Email notification support
- Real-time update capability (WebSocket ready)
- Role-targeted system alerts

---

### 🛠️ Administrative Control Panel

- User management
- Role assignment
- System monitoring
- Case analytics
- Activity overview dashboard

---

## 🏗️ System Goals

✔ Improve efficiency in legal case handling  
✔ Reduce manual paperwork  
✔ Ensure financial transparency  
✔ Increase accountability through audit logs  
✔ Provide scalable architecture  
✔ Deliver secure and modern justice service infrastructure  

---

# 🛠️ Tech Stack

## 🚀 Backend

![Django](https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white)
![Django REST Framework](https://img.shields.io/badge/DRF-ff1709?style=for-the-badge&logo=django&logoColor=white)
![Simple JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

- Django
- Django REST Framework
- SimpleJWT Authentication

---

## 🎨 Frontend

![Next JS](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)

- Next.js (Fullstack React Framework)
- Server-Side Rendering (SSR)
- API Integration with REST Backend

---

## 🗄️ Database

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)

- PostgreSQL (Relational Database)

---

## 🔐 Authentication & Security

![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![RBAC](https://img.shields.io/badge/RBAC-4CAF50?style=for-the-badge)

- JSON Web Token (JWT)
- Role-Based Access Control (RBAC)
- Secure Password Hashing
- Token Blacklisting

---

## 🏗️ Architecture

![REST API](https://img.shields.io/badge/REST-02569B?style=for-the-badge)
![MVC](https://img.shields.io/badge/MVC-FF9800?style=for-the-badge)

- RESTful API Architecture
- Modular Django Apps
- Scalable Service-Oriented Design

## 📁 Project Structure

```
justicehub/
│
├── accounts/        # User management & authentication
├── cases/           # Case management
├── payments/        # Payment processing
├── documents/       # File handling
├── notifications/   # Alerts & messaging
├── audit/           # Activity logging
├── core/            # Shared utilities
│
├── config/          # Project settings
└── manage.py
```

---

## ⚙️ Installation Guide

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Degaga-Emiru/justicehub
cd justicehub
```

### 2️⃣ Create Virtual Environment

```bash
python -m venv venv
```

Activate:

Windows:
```bash
venv\Scripts\activate
```

Mac/Linux:
```bash
source venv/bin/activate
```

### 3️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 4️⃣ Configure Environment Variables

Create a `.env` file:

```
DEBUG=True
SECRET_KEY=your_secret_key
DATABASE_NAME=justicehub
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_HOST=localhost
DATABASE_PORT=5432
```

### 5️⃣ Apply Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6️⃣ Create Superuser

```bash
python manage.py createsuperuser
```

### 7️⃣ Run Server

```bash
python manage.py runserver
```

API runs at:

```
http://127.0.0.1:8000/api/
```

---

## 🔐 Security Considerations

- Secure password hashing
- JWT authentication
- Role-based permission enforcement
- Audit logging for sensitive operations
- Secure file access controls

---

## 🎯 Vision

Justice Hub aims to bridge the gap between technology and the legal system by delivering a secure, scalable, and intelligent justice management platform for modern institutions.

It is designed as a **complete digital justice infrastructure**.

---

## 👨‍💻 Author

**Degaga Emiru**  
Full Stack Developer
Addis Ababa, Ethiopia 🇪🇹