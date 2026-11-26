jest.mock('../src/models/user.model', () => ({
  updateProfile: jest.fn(),
}));

jest.mock('../src/services/token.service', () => ({}));

const userModel = require('../src/models/user.model');
const authController = require('../src/controllers/auth.controller');

describe('profile authorization boundaries', () => {
  it('rejects attempts to change the account role through profile updates', async () => {
    userModel.updateProfile.mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      phone: '0800000000',
      name: 'Test User',
      age: 70,
      role: 'elderly',
    });
    const req = {
      user: { id: '11111111-1111-4111-8111-111111111111', role: 'elderly' },
      body: { name: 'Test User', age: 70, role: 'caregiver' },
    };
    const res = {
      cookie: jest.fn(),
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await authController.updateMe(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
});
