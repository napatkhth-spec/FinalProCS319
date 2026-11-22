import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createAddress, deleteAddress, listAddresses, updateAddress, type AddressInput } from '../features/addresses/address.service'

const emptyAddress: AddressInput = { recipientName: '', phone: '', addressLine: '', subDistrict: '', district: '', province: '', postalCode: '', isDefault: false }

export function AddressesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<AddressInput>(emptyAddress)
  const [editingId, setEditingId] = useState<string | null>(null)
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: listAddresses })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['addresses'] })
  const save = useMutation({ mutationFn: () => editingId ? updateAddress(editingId, form) : createAddress(form), onSuccess: async () => { setForm(emptyAddress); setEditingId(null); await refresh() } })
  const remove = useMutation({ mutationFn: deleteAddress, onSuccess: refresh })
  function submit(event: FormEvent) { event.preventDefault(); save.mutate() }
  function beginEdit(address: AddressInput & { id: string }) { setEditingId(address.id); const { id: _id, ...fields } = address; setForm(fields) }

  return <section className="mx-auto max-w-4xl px-5 py-12">
    <h1 className="text-3xl font-bold">ที่อยู่จัดส่ง</h1>
    {addresses.isPending ? <p role="status" className="mt-5">กำลังโหลดที่อยู่…</p> : addresses.isError ? <p role="alert" className="mt-5 text-red-700">โหลดที่อยู่ไม่สำเร็จ</p> : addresses.data.length === 0 ? <p className="mt-5 text-stone-600">ยังไม่มีที่อยู่จัดส่ง</p> : <div className="mt-5 space-y-3">{addresses.data.map((address) => <article key={address.id} className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{address.recipientName}</strong> · {address.phone}{address.isDefault && <span className="ml-2 text-xs text-green-800">ค่าเริ่มต้น</span>}<p className="mt-1 text-sm text-stone-600">{address.addressLine} แขวง/ตำบล {address.subDistrict} เขต/อำเภอ {address.district} {address.province} {address.postalCode}</p></div><div className="flex gap-3"><button onClick={() => beginEdit(address)} className="text-sm text-green-800 underline">แก้ไข</button><button disabled={remove.isPending} onClick={() => remove.mutate(address.id)} className="text-sm text-red-700 underline">ลบ</button></div></div></article>)}</div>}
    <form onSubmit={submit} className="mt-8 grid gap-4 rounded-xl bg-stone-50 p-5 sm:grid-cols-2">
      <h2 className="sm:col-span-2 text-xl font-semibold">{editingId ? 'แก้ไขที่อยู่' : 'เพิ่มที่อยู่ใหม่'}</h2>
      {([['recipientName','ชื่อผู้รับ'],['phone','เบอร์โทรศัพท์'],['addressLine','บ้านเลขที่ / ถนน'],['subDistrict','แขวง / ตำบล'],['district','เขต / อำเภอ'],['province','จังหวัด'],['postalCode','รหัสไปรษณีย์']] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<input required maxLength={key === 'addressLine' ? 300 : 120} value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" /></label>)}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault ?? false} onChange={(event) => setForm((current) => ({ ...current, isDefault: event.target.checked }))} />ตั้งเป็นที่อยู่เริ่มต้น</label>
      {(save.isError || remove.isError) && <p role="alert" className="sm:col-span-2 text-red-700">{save.error?.message || remove.error?.message || 'ดำเนินการไม่สำเร็จ'}</p>}
      <div className="flex gap-3 sm:col-span-2"><button disabled={save.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50">{save.isPending ? 'กำลังบันทึก…' : editingId ? 'บันทึกการแก้ไข' : 'เพิ่มที่อยู่'}</button>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(emptyAddress) }} className="rounded-lg border px-4 py-2">ยกเลิก</button>}</div>
    </form>
  </section>
}
