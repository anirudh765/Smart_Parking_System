const USER_COOKIE_NAME = 'user_token';

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 5 * 60 * 1000,
  path: '/'
});

const setUserSessionCookie = (res, token) => {
  res.cookie(USER_COOKIE_NAME, token, buildCookieOptions());
};

const clearUserSessionCookie = (res) => {
  res.clearCookie(USER_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  });
};

module.exports = {
  USER_COOKIE_NAME,
  setUserSessionCookie,
  clearUserSessionCookie
};
