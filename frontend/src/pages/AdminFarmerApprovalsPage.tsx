import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approveFarmer, listPendingFarmers } from '../features/farmers/farmer.service';

export function AdminFarmerApprovalsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const applications = useQuery({ queryKey: ['admin', 'farmer-approvals'], queryFn: listPendingFarmers });
  const approval = useMutation({
    mutationFn: approveFarmer,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'farmer-approvals'] }),
        queryClient.invalidateQueries({ queryKey: ['farmer-profile'] }),
      ]);
      setSelectedId(null);
    },
  });

  function confirmApproval(profileId: string, shopName: string) {
    if (window.confirm(`ยืนยันอนุมัติร้าน “${shopName}” หรือไม่?`)) approval.mutate(profileId);
  }

  return (
    <section>
      <h1 className="text-3xl font-bold">คำขอเปิดร้านค้า</h1>
      {applications.isPending ? (
        <p role="status" className="mt-5">
          กำลังโหลดคำขอ…
        </p>
      ) : applications.isError ? (
        <div className="mt-5">
          <p role="alert" className="text-red-700">
            {applications.error.message || 'โหลดคำขอไม่สำเร็จ'}
          </p>
          <button type="button" onClick={() => void applications.refetch()} className="mt-2 underline">
            ลองอีกครั้ง
          </button>
        </div>
      ) : applications.data.length === 0 ? (
        <p className="mt-5 text-stone-600">ไม่มีคำขอที่รออนุมัติ</p>
      ) : (
        <div className="mt-5 space-y-4">
          {applications.data.map((application) => (
            <article key={application.id} className="rounded-xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{application.shopName}</h2>
                  <p className="mt-1 text-stone-700">Farmer: {application.user.fullName}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    ส่งคำขอ {new Date(application.createdAt).toLocaleString('th-TH')}
                  </p>
                  <p className="mt-1 text-sm font-medium text-amber-800">
                    สถานะ: {application.verificationStatus}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedId(selectedId === application.id ? null : application.id)}
                    className="rounded-lg border px-4 py-2"
                  >
                    {selectedId === application.id ? 'ซ่อนรายละเอียด' : 'ดูรายละเอียด'}
                  </button>
                  <button
                    type="button"
                    disabled={approval.isPending}
                    onClick={() => confirmApproval(application.id, application.shopName)}
                    className="rounded-lg bg-green-700 px-4 py-2 text-white disabled:opacity-50"
                  >
                    {approval.isPending && approval.variables === application.id ? 'กำลังอนุมัติ…' : 'อนุมัติ'}
                  </button>
                </div>
              </div>
              {selectedId === application.id && (
                <dl className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm text-stone-500">ชื่อ Farmer</dt>
                    <dd>{application.user.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-stone-500">ชื่อร้าน</dt>
                    <dd>{application.shopName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-stone-500">ที่อยู่ฟาร์ม</dt>
                    <dd>{application.farmAddress || 'ไม่ได้ระบุ'}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm text-stone-500">รายละเอียดร้าน</dt>
                    <dd className="whitespace-pre-wrap">{application.description || 'ไม่ได้ระบุ'}</dd>
                  </div>
                </dl>
              )}
            </article>
          ))}
        </div>
      )}
      {approval.isError && (
        <p role="alert" className="mt-4 text-red-700">
          {approval.error.message || 'อนุมัติคำขอไม่สำเร็จ'}
        </p>
      )}
      {approval.isSuccess && (
        <p role="status" className="mt-4 text-green-800">
          อนุมัติคำขอเปิดร้านแล้ว
        </p>
      )}
    </section>
  );
}
