export interface UserData {
  id?: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER';
  password?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER';
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createUser = (data: UserData): User => {
  return {
    id: data.id || 'user-' + Math.random().toString(36).substr(2, 9),
    email: data.email,
    username: data.username,
    role: data.role,
    password: data.password || 'password',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};
