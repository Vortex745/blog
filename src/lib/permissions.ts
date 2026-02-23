
export const ADMIN_USERNAME = 'zijin';

export function isAdmin(username?: string) {
    return username === ADMIN_USERNAME;
}
