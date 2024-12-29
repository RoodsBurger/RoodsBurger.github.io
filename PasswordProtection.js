import { Lock } from 'lucide-react';

// We'll use a hash of the password instead of storing it directly
// This is the hash for "magnetic2024" - you should change this to your desired password
const PASS_HASH = "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8";

const PasswordProtection = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    // Check if previously authenticated
    const auth = sessionStorage.getItem('wallet-auth');
    if (auth === PASS_HASH) {
      setIsAuthenticated(true);
    }
  }, []);

  const hashPassword = async (password) => {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hashedInput = await hashPassword(password);
    
    if (hashedInput === PASS_HASH) {
      setIsAuthenticated(true);
      sessionStorage.setItem('wallet-auth', PASS_HASH);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  if (isAuthenticated) {
    return children;
  }

  // Password Dialog
  return React.createElement('div', {
    className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4'
  }, 
    React.createElement('div', {
      className: 'bg-white rounded-lg p-6 w-full max-w-md'
    }, [
      // Header
      React.createElement('div', {
        key: 'header',
        className: 'text-center mb-6'
      }, [
        React.createElement('div', {
          key: 'icon-container',
          className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4'
        }, 
          React.createElement('svg', {
            className: 'w-6 h-6 text-blue-600',
            fill: 'none',
            stroke: 'currentColor',
            viewBox: '0 0 24 24',
            xmlns: 'http://www.w3.org/2000/svg'
          },
            React.createElement('path', {
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              strokeWidth: '2',
              d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
            })
          )
        ),
        React.createElement('h2', {
          key: 'title',
          className: 'text-xl font-semibold text-gray-900'
        }, 'Password Protected Content')
      ]),
      
      // Form
      React.createElement('form', {
        key: 'form',
        onSubmit: handleSubmit,
        className: 'space-y-4'
      }, [
        React.createElement('div', {
          key: 'input-container'
        }, [
          React.createElement('input', {
            key: 'password-input',
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            placeholder: 'Enter password',
            className: 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
            autoFocus: true
          }),
          error && React.createElement('p', {
            key: 'error',
            className: 'mt-2 text-sm text-red-600'
          }, error)
        ]),
        React.createElement('button', {
          key: 'submit-button',
          type: 'submit',
          className: 'w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors'
        }, 'Access Content')
      ])
    ])
  );
};

export default PasswordProtection;