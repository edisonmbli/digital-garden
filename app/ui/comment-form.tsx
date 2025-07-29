// app/ui/comment-form.tsx
'use client'

import { useActionState } from 'react'
import { commentAction } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// 定义 commentAction 的返回类型
type CommentActionState = { success: true } | { error: string } | null

export function CommentForm({ postId }: { postId: string }) {
  // 1. 我们为 useActionState 传入一个符合其期望的、新的 action 函数
  //    这个函数接收 prevState 和 formData
  const [state, formAction] = useActionState<CommentActionState, FormData>(
    async (prevState, formData): Promise<CommentActionState> => {
      // 2. 在这个函数内部，我们再调用我们真正的 Server Action，
      //    并清晰地传入 postId 和 formData
      const result = await commentAction(postId, formData)
      
      // 确保返回类型匹配
       if ('success' in result) {
         return { success: true }
       } else {
         return { error: result.error || '操作失败' }
       }
    },

    null // 初始状态
  )

  return (
    // 3. 将这个新的 formAction，直接传递给 form
    <form action={formAction}>
      <Textarea name="comment" placeholder="Add a comment..." />
      <Button type="submit" className="mt-2">
        Submit
      </Button>
      {state && 'error' in state && (
        <p className="text-red-500 text-sm mt-2">{state.error}</p>
      )}
    </form>
  )
}
