import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useForm } from 'react-hook-form';

async function fetchCategories(companyId = 1) {
  const res = await api.get('/categories', { params: { companyId } });
  return res.data;
}

export default function Categories() {
  const companyId = 1;
  const { data, refetch, isLoading, error } = useQuery({
    queryKey: ['categories', companyId],
    queryFn: () => fetchCategories(companyId)
  });

  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  async function onSubmit(values) {
    try {
      await api.post('/categories', { ...values, companyId });
      setOpen(false);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Create failed');
    }
  }

  if (error) console.error('Categories fetch error', error);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Categories</h2>
        <button onClick={() => { reset(); setOpen(true); }} className="bg-primary-500 text-white px-3 py-1 rounded">New</button>
      </div>

      <Card>
        {isLoading ? <div>Loading...</div> : (
          <ul>
            {data?.map(c => (
              <li key={c.id} className="py-2 border-b">
                <div className="font-medium">{c.name}</div>
                {c.subcategories && c.subcategories.length > 0 && (
                  <ul className="pl-4 text-sm text-gray-600">
                    {c.subcategories.map(s => <li key={s.id}>{s.name}</li>)}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New category">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div><label>Name</label><input {...register('name')} className="w-full p-2 border rounded" /></div>
          <div><label>Parent ID (optional)</label><input type="number" {...register('parentId', { valueAsNumber: true })} className="w-full p-2 border rounded" /></div>
          <div className="flex gap-2"><button type="submit" className="bg-primary-500 text-white px-3 py-1 rounded">Create</button><button type="button" onClick={() => setOpen(false)} className="px-3 py-1 border rounded">Cancel</button></div>
        </form>
      </Modal>
    </div>
  );
}
