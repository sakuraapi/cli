//-<%if(authRole === 'issuer') {%>
export const authExcludedRoutes = [
  {
    method: {POST: true},
    regex: /^\/auth\/native$/
  },
  {
    method: {POST: true},
    regex: /^\/auth\/native\/login/
  },
  {
    method: {GET: true},
    regex: /^\/auth\/native\/confirm\/[a-fA-F0-9]*/
  },
  {
    method: {POST: true},
    regex: /^\/auth\/native\/confirm/
  },
  {
    method: {PUT: true},
    regex: /^\/auth\/native\/forgot-password/
  },
  {
    method: {PUT: true},
    regex: /^\/auth\/native\/reset-password/
  },
  {
    method: {
      DELETE: true,
      GET: true,
      HEAD: true,
      PATCH: true,
      POST: true,
      PUT: true
    },
    regex: /^$/
  }
];
//-<%}%>
//-<%if(authRole === 'audience') {%>
export const authExcludedRoutes = [
  {
    method: {
      DELETE: true,
      GET: true,
      HEAD: true,
      PATCH: true,
      POST: true,
      PUT: true
    },
    regex: /^$/
  }
];
//-<%}%>
