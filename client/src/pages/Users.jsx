import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Modal from '../components/Modal';
import { useForm } from 'react-hook-form';
import { Plus, Users as UsersIcon, Mail, Shield } from 'lucide-react';
import { toast } from 'sonner';

async function fetchUsers(companyId = 1) {
  const res = await api.get('/users', { params: { companyId } });
  return res.data;
}

export default function Users() {
  const companyId = 1;
  const qc = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['users', companyId],
    queryFn: () => fetchUsers(companyId)
  });

  const createMut = useMutation({
    mutationFn: payload => api.post('/users', payload).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', companyId] });
      toast.success('User created successfully');
    },
    onError: () => toast.error('Failed to create user')
  });

  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset } = useForm();

  async function onSubmit(values) {
    try {
      await createMut.mutateAsync({ ...values, companyId });
      setOpen(false);
      reset();
    } catch (err) {
      console.error(err);
    }
  }

  if (error) console.error('Users fetch error', error);

  const getRoleBadgeColor = (role) => {
    const colors = {
      founder: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      accountant: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      hr: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      employee: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    };
    return colors[role] || colors.employee;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Users</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }} className="bg-gradient-primary text-white hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          New User
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-muted-foreground mt-4">Loading users...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.length === 0 ? (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  No users found. Create your first user!
                </div>
              ) : (
                data?.map(user => (
                  <div
                    key={user.id}
                    className="p-6 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span>{user.email}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="New User">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...register('name')} placeholder="Full name" required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} placeholder="email@example.com" required />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <select {...register('role')} className="w-full h-10 px-3 rounded-md border border-input bg-background" required>
              <option value="employee">Employee</option>
              <option value="hr">HR</option>
              <option value="accountant">Accountant</option>
              <option value="founder">Founder</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-gradient-primary text-white" disabled={createMut.isPending}>
              {createMut.isPending ? 'Creating...' : 'Create User'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
