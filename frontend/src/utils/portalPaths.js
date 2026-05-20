export const getPortalPath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'customer') return '/shop';
  return '/';
};
