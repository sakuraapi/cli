export const dbs = {
  //-<%if (authRole === 'issuer') {%>
  authentication: {
    collection: 'authentication',
    db: 'auth'
  },
  user: {
    collection: 'users',
    db: 'user'
  }
  //-<%}%>
};
