# SAML Testing Guide with Keycloak

This guide provides step-by-step instructions for testing SAML authentication using Keycloak as the Identity Provider (IdP) with deepsel-cms.

## Prerequisites

### System Requirements

- Docker and Docker Compose installed
- deepsel-cms backend running on `http://localhost:8000`
- deepsel-cms frontend running on `http://localhost:4321` (or your configured port)

### Environment Setup

Ensure these environment variables are configured:

```bash
BACKEND_URL=http://localhost:8000
FRONTEND_URL=http://localhost:4321
```

## Step 1: Start Keycloak

### Using Docker

```bash
docker run -d \
  --name keycloak-saml-test \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest \
  start-dev
```

### Access Keycloak

1. Open <http://localhost:8080>
2. Click **Administration Console**
3. Login with username: `admin`, password: `admin`

## Step 2: Create SAML Client in Keycloak

### 2.1 Create New Client

1. Go to **Clients** → **Create Client**
2. **Client type**: `SAML`
3. **Client ID**: `http://localhost:8000/saml/metadata`
   - ⚠️ **Critical**: This must exactly match your SP Entity ID
4. Click **Next**

### 2.2 Configure Client Capability

1. **Client authentication**: `OFF`
2. **Authorization**: `OFF`  
3. Click **Next**

### 2.3 Configure Login Settings

1. **Root URL**: `http://localhost:8000`
2. **Home URL**: `http://localhost:4321/admin`
3. **Valid redirect URIs**: `http://localhost:8000/auth/saml`
4. **Valid post logout redirect URIs**: `http://localhost:4321/admin/login`
5. **Master SAML Processing URL**: `http://localhost:8000/auth/saml`
6. Click **Save**

### 2.4 Configure SAML Settings

Go to **Settings** → **SAML Settings** and configure:

**Essential Settings:**

- **Name ID Format**: `username`
- **Force Name ID Format**: `ON`

**Signature Settings:**

- **Sign Assertions**: `ON`
- **Sign Documents**: `ON`
- **Signature Algorithm**: `RSA_SHA256`

**Other Settings:**

- **Force POST Binding**: `OFF`
- **Force artifact binding**: `OFF`
- **Include AuthnStatement**: `ON`
- **Include OneTimeUse Condition**: `OFF`
- **Client Signature Required**: `OFF`

Click **Save**

## Step 3: Configure Client Mappers

### 3.1 Access Mappers

1. Go to **Client scopes** → **{your-client-id}-dedicated**
2. Go to **Mappers** tab

### 3.2 Create Email Mapper

1. Click **Add mapper** → **By configuration** → **User Property**
2. Configure:
   - **Name**: `email`
   - **Property**: `email`
   - **SAML Attribute Name**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
   - **SAML Attribute NameFormat**: `URI Reference`
3. Click **Save**

### 3.3 Create Name Mapper

1. Click **Add mapper** → **By configuration** → **User Property**
2. Configure:
   - **Name**: `fullName`
   - **Property**: `firstName`
   - **SAML Attribute Name**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`
   - **SAML Attribute NameFormat**: `URI Reference`
3. Click **Save**

## Step 4: Get Keycloak Configuration Details

### 4.1 Entity ID

Use: `http://localhost:8080/realms/master`

### 4.2 SSO URL

Use: `http://localhost:8080/realms/master/protocol/saml`

### 4.3 X.509 Certificate

1. Go to **Realm Settings** → **Keys**
2. Find the **RS256** key (Status: Active)
3. Click **Certificate** button
4. Copy the certificate content (the system will auto-add headers if needed)

## Step 5: Create Test User in Keycloak

### 5.1 Create User

1. Go to **Users** → **Create new user**
2. Configure:
   - **Username**: `testuser`
   - **Email**: `testuser@example.com`
   - **First name**: `Test`
   - **Last name**: `User`
   - **Email verified**: `ON`
3. Click **Create**

### 5.2 Set Password

1. Go to **Credentials** tab
2. Click **Set password**
3. Configure:
   - **Password**: `password123`
   - **Temporary**: `OFF`
4. Click **Set password**

## Step 6: Configure deepsel-cms Application

### 6.1 Access SAML Settings

1. Login to deepsel-cms as administrator
2. Go to **Settings** → **SAML SSO** (or `/admin/saml-settings`)

### 6.2 Enable SAML

1. Toggle **Enable SAML Authentication**: `ON`

### 6.3 Configure IdP Settings

Fill in the following:

- **IdP Entity ID**: `http://localhost:8080/realms/master`
- **IdP Single Sign-On URL**: `http://localhost:8080/realms/master/protocol/saml`
- **IdP X.509 Certificate**: Paste the certificate from Step 4.3
  - Note: You can paste just the certificate content - the system will automatically add BEGIN/END headers

### 6.4 Configure Attribute Mapping (Default, no needed set for Keycloak)

These should be pre-configured:

- **Email Attribute**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress`
- **Name Attribute**: `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name`

### 6.5 Save Configuration

Click **Save** to apply all settings

## Step 7: Test SAML Authentication

### 7.1 Verify Metadata

Test that SP metadata is accessible:

```bash
curl http://localhost:8000/saml/metadata
```

Should return XML metadata without errors.

### 7.2 Test Login Flow

1. **Logout** from deepsel-cms (if logged in)
2. Go to login page: <http://localhost:4321/admin/login>
3. You should see **Login with SAML** button
4. Click **Login with SAML**
5. You should be redirected to Keycloak login page
6. Login with: `testuser` / `password123`
7. You should be redirected back to deepsel-cms and logged in

### 7.3 Verify User Creation

Check in deepsel-cms admin panel:

- New user should be created with username: `testuser`
- Email should be: `testuser@example.com`
- Name should be: `Test`
- Role should be: `user_role`

## Step 8: Test Redirect Functionality

### 8.1 Test Protected Page Access

1. **Logout** from deepsel-cms
2. Try to access a protected page (e.g., `/admin/users`)
3. You should be redirected to login with `?redirect=` parameter
4. Click **Login with SAML**
5. Login with Keycloak
6. You should be redirected back to the original protected page

## Production Considerations

When moving to production:

1. **Use HTTPS** for all URLs
2. **Use dedicated realm** instead of master
3. **Enable client signature validation**
4. **Use proper domain names** instead of localhost
5. **Configure proper certificate rotation**
6. **Set up monitoring** for SAML authentication flows

## Configuration Summary

**Keycloak SAML Client:**

- Client ID: `http://localhost:8000/saml/metadata`
- Valid redirect URIs: `http://localhost:8000/auth/saml`
- Name ID Format: `username`
- Sign Assertions: `ON`
- Sign Documents: `ON`

**deepsel-cms SAML Settings:**

- IdP Entity ID: `http://localhost:8080/realms/master`
- IdP SSO URL: `http://localhost:8080/realms/master/protocol/saml`
- Certificate: From Keycloak Realm Settings → Keys → RS256
- Attribute mapping: URI format for email and name

This configuration should provide a working SAML authentication setup for testing and development purposes.
