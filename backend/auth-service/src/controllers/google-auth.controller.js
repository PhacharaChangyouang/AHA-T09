'use strict';
// Academic edition: external identity provider is deliberately disabled.
function disabled(req, res) { return res.status(503).json({ success: false, message: 'Google sign-in is disabled in Academic Edition' }); }
async function verifyGoogleCredential() { throw new Error('Google identity verification disabled in Academic Edition'); }
module.exports = { googleLogin: disabled, completeGoogleSignup: disabled, linkGoogle: disabled, createLinkChallenge: disabled, verifyGoogleCredential };
