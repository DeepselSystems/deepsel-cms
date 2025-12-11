# SAML Integration - Developer Notes

This document covers all changes made to implement SAML SSO authentication in deepsel-cms, including both backend and frontend modifications.

## Overview

Implemented SAML 2.0 authentication using the `python3-saml` library to enable Single Sign-On with Identity Providers like Keycloak, Azure AD, Okta, etc.

## Backend Changes

### Dependencies Added

#### requirements.txt
```
python3-saml==1.16.0
```

### Database Model Changes

#### models/user.py
```python
# Added SAML-specific field
saml_nameid = Column(String)
```
- Stores the SAML NameID for user matching
- Used to link SAML assertions to specific users

#### models/organization.py
```python
# SAML Configuration Fields
is_enabled_saml = Column(Boolean, default=False)
saml_idp_entity_id = Column(String)
saml_idp_sso_url = Column(String) 
saml_idp_x509_cert = Column(String)
saml_sp_entity_id = Column(String)
saml_sp_acs_url = Column(String)
saml_sp_sls_url = Column(String)
saml_attribute_mapping = Column(JSON, default=lambda: {
    "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
    "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
})
```

**Updated get_public_settings method:**
```python
def get_public_settings(self):
    return {
        # ... existing settings
        "is_enabled_saml": self.is_enabled_saml,
        # Expose SAML status to frontend
    }
```

### Constants Configuration

#### constants/__init__.py
```python
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
```
- Added for proper SAML endpoint URL construction
- Critical for metadata generation and ACS URL configuration

### Authentication Routes

#### routers/auth.py

**New SAML-related imports:**
```python
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from onelogin.saml2.settings import OneLogin_Saml2_Settings
```

**New data models:**
```python
class SamlUser(BaseModel):
    nameid: str
    email: str
    name: Optional[str] = None
```

**Core SAML Functions:**

##### normalize_x509_certificate()
```python
def normalize_x509_certificate(cert_content: str) -> str:
    """Add BEGIN/END headers to certificate if missing."""
```
- Auto-adds PEM headers if user forgets them
- Handles common certificate format issues
- Simplifies certificate configuration for admins

##### getSamlSettings()
```python
def getSamlSettings(db: Session, require_idp: bool = True) -> dict:
    """Build SAML configuration dictionary for python3-saml library."""
```

**Key configuration aspects:**
- **Service Provider (SP) settings**: Entity ID, ACS URL, SLS URL
- **Identity Provider (IdP) settings**: Entity ID, SSO URL, Certificate
- **Security settings**: Signature validation, NameID format, algorithms
- **Certificate normalization**: Automatic PEM header addition

**Security Configuration:**
```python
"security": {
    "nameIdEncrypted": False,
    "authnRequestsSigned": False,
    "logoutRequestSigned": False,  
    "logoutResponseSigned": False,
    "signMetadata": False,
    "wantAssertionsSigned": True,  # Require signed assertions
    "wantNameId": True,
    "wantAssertionsEncrypted": False,
    "wantNameIdEncrypted": False,
    "requestedAuthnContext": False,
    "allowRepeatAttributeName": True,  # Handle duplicate attributes
    "signatureAlgorithm": "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
    "digestAlgorithm": "http://www.w3.org/2001/04/xmlenc#sha256"
}
```

##### Helper Functions
```python
def init_saml_auth(req, db: Session):
    """Initialize SAML auth object with configuration."""

def prepare_fastapi_request(request: Request):
    """Convert FastAPI request to python3-saml format."""
```

**New API Endpoints:**

##### GET /login/saml
```python
@router.get("/login/saml")
async def login_saml(request: Request, db: Session = Depends(get_db), redirect: str = None):
```
- Initiates SAML SSO flow
- Accepts optional redirect parameter for post-auth navigation
- Uses `auth.login(return_to=redirect)` to preserve RelayState

##### POST /auth/saml  
```python
@router.post("/auth/saml")
async def auth_saml(request: Request, db: Session = Depends(get_db)):
```

**Key processing steps:**
1. **Process SAML Response**: `auth.process_response()`
2. **Extract user data**: NameID, email, name from attributes
3. **User matching logic**:
   ```python
   # Try by email first
   if saml_user.email and saml_user.email != saml_user.nameid:
       existing_user = db.query(UserModel).filter(UserModel.email == saml_user.email).one_or_none()
   
   # Fallback to username (NameID) if email not available
   if not existing_user:
       existing_user = db.query(UserModel).filter(UserModel.username == saml_user.nameid).one_or_none()
   ```

4. **User creation for new users**:
   ```python
   user = UserModel(
       username=saml_user.nameid,  # Use SAML NameID as username
       email=saml_user.email,      # Use email attribute
       name=saml_user.name,        # Use name attribute
       saml_nameid=saml_user.nameid,
       signed_up=True,
       organization_id=organization.id if organization else 1,
   )
   
   # Assign default role
   role = db.query(RoleModel).filter(RoleModel.string_id == "user_role").first()
   ```

5. **RelayState handling**: 
   ```python
   relay_state = req['post_data'].get('RelayState')
   if relay_state:
       return RedirectResponse(
           f"{FRONTEND_URL}/admin/saml-authenticated?access_token={access_token}&redirect={relay_state}"
       )
   ```

##### GET /saml/metadata
```python
@router.get("/saml/metadata")
async def saml_metadata(db: Session = Depends(get_db)):
```
- Generates SP metadata XML for IdP configuration
- Works without IdP configuration (`require_idp=False`)
- Returns XML with proper Content-Type headers

### Key Implementation Decisions

#### Security Approach
- **Production-ready security**: Requires signed assertions by default
- **Certificate validation**: Uses full X.509 certificates, not fingerprints
- **Modern algorithms**: SHA-256 for signatures and digests
- **Flexible attribute handling**: Supports duplicate attributes from various IdPs

#### User Management
- **Username strategy**: Uses SAML NameID as username (typically IdP username)
- **Email matching**: Primary method for linking existing users
- **Fallback matching**: Uses username if email not available
- **Default role**: New SAML users get `user_role` 
- **Account linking**: Existing users automatically linked via email

#### Error Handling
- **Comprehensive logging**: All SAML processing steps logged
- **Graceful failures**: Proper HTTP error responses
- **Debug information**: Detailed error reasons in logs

## Frontend Changes

### New Components

#### components/admin/organization/SamlSetting.jsx
Full-featured SAML configuration interface with:

**SAML Toggle:**
```jsx
<Switch
  checked={organization.is_enabled_saml || false}
  onChange={(value) => setFieldValue('is_enabled_saml', value)}
  label={t('Enable SAML Authentication')}
/>
```

**IdP Configuration Fields:**
- Entity ID input with validation
- SSO URL input with validation
- X.509 Certificate textarea (auto-normalizes format)

**SP Information Display:**
- Read-only SP Entity ID
- Read-only ACS URL  
- Read-only Metadata URL with copy button

**Attribute Mapping:**
- Configurable email attribute name
- Configurable name attribute name
- JSON format with validation

#### common/auth/SamlAuth.jsx
SAML authentication callback handler:

```jsx
const storeAccessToken = useCallback(async () => {
  const accessToken = query.get('access_token');
  const redirect = query.get('redirect');

  if (accessToken) {
    await Preferences.set({
      key: 'token',
      value: accessToken,
    });
  }

  // Navigate to redirect URL if provided, otherwise go to home
  const redirectUrl = redirect ? decodeURIComponent(redirect) : '/';
  navigate(redirectUrl);
}, [query, navigate]);
```

**Key features:**
- Extracts access token from URL
- Stores token in device preferences
- Handles redirect parameter for post-auth navigation
- Graceful fallback to home page

### Modified Components

#### components/admin/auth/Login.jsx

**SAML Login Button:**
```jsx
{orgPublicSettings?.is_enabled_saml && (
  <Button
    className="flex items-center"
    variant="light"
    onClick={() => {
      const redirect = new URLSearchParams(location.search).get('redirect');
      const samlUrl = redirect 
        ? `${backendHost}/login/saml?redirect=${encodeURIComponent(redirect)}`
        : `${backendHost}/login/saml`;
      window.location.href = samlUrl;
    }}
  >
    <div className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded text-xs font-bold">
      S
    </div>
    <div className="ml-4">{t('Login with SAML')}</div>
  </Button>
)}
```

**Key features:**
- Conditional rendering based on `orgPublicSettings.is_enabled_saml`
- Extracts redirect parameter from current URL
- Passes redirect parameter to backend SAML initiation
- Custom SAML icon with consistent styling

### Routing Updates

#### App.jsx
```jsx
// New SAML route
<Route 
  path="/admin/saml-authenticated" 
  element={<SamlAuth />} 
/>
```

### Navigation Integration
- SAML settings added to admin navigation
- Proper permissions checking for SAML configuration access

## Technical Architecture

### SAML Flow Implementation

```
1. User clicks "Login with SAML"
   ↓ (with redirect parameter)
2. GET /login/saml?redirect=/protected-page  
   ↓ (creates SAML AuthnRequest with RelayState)
3. Redirect to IdP with SAML request
   ↓ (user authenticates)
4. IdP POST to /auth/saml with SAML response + RelayState
   ↓ (processes response, matches/creates user)  
5. Redirect to /admin/saml-authenticated?access_token=xxx&redirect=/protected-page
   ↓ (frontend stores token)
6. Navigate to /protected-page
```

### Security Considerations

#### Certificate Management
- **Auto-normalization**: Handles missing PEM headers
- **Validation**: Proper certificate format validation
- **Storage**: Secure database storage of IdP certificates

#### Session Management
- **Token-based**: Uses existing JWT token system
- **Secure storage**: Tokens stored in device preferences
- **Expiration**: Follows existing token expiration policies

#### Input Validation
- **SAML response validation**: Signature verification
- **Attribute sanitization**: Safe extraction of user attributes
- **URL validation**: Proper redirect URL handling

### Error Handling Strategy

#### Backend
- **Comprehensive logging**: All SAML operations logged
- **Graceful failures**: Proper HTTP error codes
- **Debug information**: Detailed error context in logs

#### Frontend  
- **User-friendly errors**: Clear error messages for config issues
- **Fallback behavior**: Graceful handling of missing SAML config
- **Validation feedback**: Real-time form validation

### Performance Considerations

#### Caching
- **Settings caching**: Organization SAML settings cached
- **Metadata generation**: Efficient SP metadata creation
- **Certificate parsing**: Optimized certificate normalization

#### Database
- **Indexed fields**: Proper indexing on saml_nameid and email
- **Efficient queries**: Optimized user lookup queries
- **Minimal overhead**: SAML fields don't impact existing flows

### Configuration Management

#### Environment Variables
```bash
BACKEND_URL=http://localhost:8000    # Required for SAML endpoints
FRONTEND_URL=http://localhost:4321   # Required for redirects
```

#### Database Migration
```sql
-- User table
ALTER TABLE user ADD COLUMN saml_nameid VARCHAR;

-- Organization table  
ALTER TABLE organization ADD COLUMN is_enabled_saml BOOLEAN DEFAULT FALSE;
ALTER TABLE organization ADD COLUMN saml_idp_entity_id VARCHAR;
ALTER TABLE organization ADD COLUMN saml_idp_sso_url VARCHAR;
ALTER TABLE organization ADD COLUMN saml_idp_x509_cert TEXT;
ALTER TABLE organization ADD COLUMN saml_sp_entity_id VARCHAR;
ALTER TABLE organization ADD COLUMN saml_sp_acs_url VARCHAR;
ALTER TABLE organization ADD COLUMN saml_sp_sls_url VARCHAR;
ALTER TABLE organization ADD COLUMN saml_attribute_mapping JSON;
```

### Testing Strategy

#### Unit Tests Needed
- Certificate normalization function
- SAML settings configuration  
- User matching logic
- Attribute extraction

#### Integration Tests Needed
- Full SAML authentication flow
- Redirect parameter handling
- Error scenarios (invalid certificates, malformed responses)
- Multiple IdP configurations

#### End-to-End Tests
- Complete user journey with real IdP
- Cross-browser compatibility
- Mobile device testing
- Network failure scenarios

## Deployment Considerations

### Production Checklist
- [ ] Enable HTTPS for all SAML endpoints
- [ ] Use production IdP (not development/testing realm)
- [ ] Configure proper certificate rotation
- [ ] Enable request signing for enhanced security
- [ ] Set up monitoring for SAML authentication flows
- [ ] Configure proper logging levels
- [ ] Test failover scenarios

### Monitoring & Observability
- **Key metrics**: SAML login success/failure rates
- **Log monitoring**: SAML-specific error patterns
- **Performance**: Authentication flow duration
- **Security**: Certificate expiration alerts

### Maintenance Tasks
- **Certificate rotation**: IdP certificate updates
- **Configuration updates**: IdP URL changes
- **User management**: SAML user cleanup/migration
- **Security updates**: python3-saml library updates

## Future Enhancements

### Potential Improvements
- **Multiple IdP support**: Organization-specific IdP configurations
- **Advanced attribute mapping**: Custom user field mapping
- **Group/role mapping**: SAML group to application role mapping
- **SLO support**: Single Logout implementation
- **Federation metadata**: Dynamic IdP discovery
- **Just-in-time provisioning**: Advanced user creation rules

### Technical Debt
- **Type annotations**: Add comprehensive type hints
- **Error handling**: More granular error types
- **Configuration validation**: Enhanced settings validation
- **Performance optimization**: Caching improvements

This implementation provides a robust, secure, and user-friendly SAML authentication system that integrates seamlessly with the existing deepsel-cms authentication architecture.