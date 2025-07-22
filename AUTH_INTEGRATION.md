# Authentication Integration

This document explains the authentication integration between the frontend and your server API handlers.

## API Endpoints

Your server provides the following authentication endpoints:

- `POST /login` - User login with email/password
- `POST /register` - User registration with email/password  
- `GET /logout` - User logout

## Frontend Integration

### Cloud Service (`src/services/cloud-service.ts`)

The `CloudService` class now includes three main authentication methods:

#### `login(credentials: LoginCredentials)`
- Sends POST request to `/login` with form data
- Expects server to redirect to `/save` on success
- Stores authentication token and user info locally
- Throws error on authentication failure

#### `register(credentials: RegisterCredentials)`
- Sends POST request to `/register` with form data
- Handles existing user error case
- Does not auto-login after registration
- Throws error if registration fails

#### `logout()`
- Sends GET request to `/logout` 
- Clears local authentication data
- Gracefully handles server errors

### Settings Page (`src/pages/SettingsPage.tsx`)

The settings page provides a complete authentication UI:

- **Login Modal**: Email/password form with error handling
- **Register Modal**: Name/email/password form with validation
- **User Status**: Shows logged-in user info when authenticated
- **Logout Button**: Handles logout with loading state
- **Error Handling**: Toast notifications for success/failure

## Usage

### From the Settings Page
1. Navigate to Settings
2. Click "Login" or "Register" 
3. Fill out the form
4. Handle success/error states automatically

### Programmatically
```typescript
import { cloudService } from './services/cloud-service';

// Login
try {
  await cloudService.login({ email: 'user@example.com', password: 'password' });
  console.log('Login successful');
} catch (error) {
  console.error('Login failed:', error.message);
}

// Register
try {
  await cloudService.register({ 
    name: 'John Doe',
    email: 'john@example.com', 
    password: 'securepassword' 
  });
  console.log('Registration successful');
} catch (error) {
  console.error('Registration failed:', error.message);
}

// Logout
await cloudService.logout();

// Check auth status
if (cloudService.isAuthenticated()) {
  const user = cloudService.getCurrentUserInfo();
  console.log('Logged in as:', user?.email);
}
```

## Testing

Use the test utilities in `src/utils/auth-test.ts`:

```typescript
import { testAuthFlow, checkAuthStatus, clearAuthData } from './utils/auth-test';

// Test complete auth flow
testAuthFlow();

// Check current status
checkAuthStatus();

// Clear all auth data
clearAuthData();
```

## Notes

1. **Form Data**: The server expects `application/x-www-form-urlencoded` data, not JSON
2. **Redirects**: Login success is detected by checking for redirect to `/save`
3. **Token Storage**: Tokens are stored in localStorage for persistence
4. **Error Handling**: All methods include proper error handling and user feedback
5. **Loading States**: UI shows loading indicators during API calls

## Server Configuration

Make sure your server is running on the configured port (default: 8888) and has CORS enabled for cross-origin requests from the frontend.
