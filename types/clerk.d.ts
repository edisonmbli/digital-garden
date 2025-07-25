// 为 Clerk 定义自定义类型扩充
export {}

declare global {
  namespace ClerkTypes {
    interface UserPublicMetadata {
      role?: 'admin' | 'user'
    }
  }
}
