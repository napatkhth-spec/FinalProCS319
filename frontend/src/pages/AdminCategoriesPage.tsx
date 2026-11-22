import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, deleteCategory, listCategories, updateCategory } from '../features/categories/category.service'
import type { Category } from '../types'

export function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parentId, setParentId] = useState('')
  const [editing, setEditing] = useState<Category | null>(null)
  const categories = useQuery({ queryKey: ['categories'], queryFn: listCategories })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] })
  const save = useMutation({ mutationFn: () => editing ? updateCategory(editing.id, { name, description: description || null, parentId: parentId || null }) : createCategory({ name, description: description || null, parentId: parentId || null }), onSuccess: async () => { setName(''); setDescription(''); setParentId(''); setEditing(null); await refresh() } })
  const remove = useMutation({ mutationFn: deleteCategory, onSuccess: refresh })
  function edit(category: Category) { setEditing(category); setName(category.name); setDescription(category.description ?? ''); setParentId(category.parentId ?? '') }
  function submit(event: FormEvent) { event.preventDefault(); save.mutate() }

  return <section className="mx-auto max-w-5xl px-5 py-10"><h1 className="text-3xl font-bold">จัดการหมวดหมู่สินค้า</h1>
    {categories.isPending ? <p role="status" className="mt-5">กำลังโหลดหมวดหมู่…</p> : categories.isError ? <p role="alert" className="mt-5 text-red-700">โหลดหมวดหมู่ไม่สำเร็จ</p> : categories.data.length === 0 ? <p className="mt-5 text-stone-600">ยังไม่มีหมวดหมู่</p> : <div className="mt-5 divide-y rounded-xl border bg-white">{categories.data.map((category) => <div key={category.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><strong>{category.name}</strong>{category.parent && <span className="ml-2 text-sm text-stone-500">ภายใต้ {category.parent.name}</span>}<p className="text-sm text-stone-600">{category.description || 'ไม่มีรายละเอียด'} · {category._count?.products ?? 0} สินค้า · {category._count?.children ?? 0} หมวดย่อย</p></div><div className="flex gap-3"><button onClick={() => edit(category)} className="text-sm text-green-800 underline">แก้ไข</button><button disabled={remove.isPending} onClick={() => remove.mutate(category.id)} className="text-sm text-red-700 underline">ลบ</button></div></div>)}</div>}
    <form onSubmit={submit} className="mt-8 grid gap-4 rounded-xl bg-stone-50 p-5 sm:grid-cols-2"><h2 className="sm:col-span-2 text-xl font-semibold">{editing ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'}</h2><label className="text-sm">ชื่อ<input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="text-sm">หมวดหมู่หลัก<select value={parentId} onChange={(event) => setParentId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="">ไม่มี (หมวดหมู่หลัก)</option>{categories.data?.filter((category) => category.id !== editing?.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="text-sm sm:col-span-2">รายละเอียด<textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>{(save.isError || remove.isError) && <p role="alert" className="sm:col-span-2 text-red-700">{save.error?.message || remove.error?.message || 'ดำเนินการไม่สำเร็จ'}</p>}<div className="flex gap-3 sm:col-span-2"><button disabled={save.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">{save.isPending ? 'กำลังบันทึก…' : editing ? 'บันทึก' : 'เพิ่มหมวดหมู่'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setName(''); setDescription(''); setParentId('') }} className="rounded-lg border px-4 py-2">ยกเลิก</button>}</div></form>
  </section>
}
