import axios from 'axios';

async function setupAdmin() {
  console.log('Triggering Admin Setup...');
  try {
    const response = await axios.post('http://localhost:5000/api/admin/setup', {
      email: 'abyra.com@gmail.com',
      password: 'admin_password_123', // Temporary password for setup
      secret: 'abyra_admin_setup_2024'
    });
    console.log('Setup Response:', response.data);
  } catch (err: any) {
    console.error('Setup Failed:', err.response?.data || err.message);
  }
}

setupAdmin();
