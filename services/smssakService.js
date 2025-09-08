const axios = require('axios');

class SMSSakService {
  constructor() {
    this.apiKey = '87ffd3f52b441fdc906f204efdc3aaca:a69edbd5beb89b5bda56190f32d4d41da4c949ce23ad15ccf2133588cb3b1cbb7645747179483b254e531e574226ca40a50096844ec7878a8d130bc8422082acba6250949befe478edc62b1354a71829';
    this.projectId = 'wajbatek-ttaco';
    this.baseURL = 'https://api.smssak.com';
  }

  async sendOtp(country, phone, otp) {
    try {
      console.log(`📱 Sending OTP to ${phone}: ${otp}`);
      
      const response = await axios.post(`${this.baseURL}/send-otp`, {
        country,
        projectId: this.projectId,
        phone,
        otp,
        key: this.apiKey,
      });

      console.log('✅ SMSSak response:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ SMSSak send OTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async verifyOtp(country, phone, otp) {
    try {
      console.log(`🔍 Verifying OTP for ${phone}: ${otp}`);
      
      const response = await axios.post(`${this.baseURL}/verify-otp`, {
        country,
        projectId: this.projectId,
        phone,
        otp,
        key: this.apiKey,
      });

      console.log('✅ SMSSak verify response:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ SMSSak verify OTP error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new SMSSakService();
