import api from './api';

export const walletService = {
  getWallet:          ()       => api.get('/wallet'),
  getTransactions:    (params) => api.get('/wallet/transactions', { params }),
  createTopUpOrder:   (data)   => api.post('/wallet/topup/create-order', data),
  verifyTopUp:        (data)   => api.post('/wallet/topup/verify', data),
  getEarnings:        ()       => api.get('/wallet/earnings'),
  getPlatformEarnings:()       => api.get('/wallet/platform-earnings'),
};