import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Edit, Trash2, Key, Users, Mail, Phone, Shield, UserCheck, Plus, Loader, ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";



export const RBACManagementPage = () => {
  const [activeTab, setActiveTab] = useState("roles");
  const [permissions, setPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newPermission, setNewPermission] = useState({ name: '', description: '' });
  const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] });
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', password: '', role: '', status: 'Active' });
  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Pagination states for each tab
  const [permissionsPage, setPermissionsPage] = useState(1);
  const [permissionsPerPage, setPermissionsPerPage] = useState(10);
  const [rolesPage, setRolesPage] = useState(1);
  const [rolesPerPage, setRolesPerPage] = useState(10);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);
  const [paginatedPermissions, setPaginatedPermissions] = useState([]);
  const [paginatedRoles, setPaginatedRoles] = useState([]);
  const [paginatedUsers, setPaginatedUsers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [permissionsRes, rolesRes, usersRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/rbac/permissions`),
        fetch(`${import.meta.env.VITE_API_URL}/api/rbac/roles`),
        fetch(`${import.meta.env.VITE_API_URL}/api/rbac/users`)
      ]);
      setPermissions(await permissionsRes.json());
      setRoles(await rolesRes.json());
      setUsers(await usersRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPermission = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission)
      });
      const permission = await res.json();

      // Add the new permission with createdAt if not provided by backend
      const permissionWithDate = {
        ...permission,
        createdAt: permission.createdAt || new Date().toISOString()
      };

      setPermissions([...permissions, permissionWithDate]);
      setNewPermission({ name: '', description: '' });
      setShowPermissionDialog(false);
    } catch (error) {
      console.error('Error adding permission:', error);
    }
  };

  const addRole = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole)
      });
      const role = await res.json();

      // Map permission IDs to full permission objects for immediate display
      const roleWithPermissions = {
        ...role,
        userCount: 0,
        permissions: role.permissions.map(permId =>
          permissions.find(p => p._id === permId) || { _id: permId, name: 'Unknown' }
        )
      };

      setRoles([...roles, roleWithPermissions]);
      setNewRole({ name: '', description: '', permissions: [] });
      setShowRoleDialog(false);
    } catch (error) {
      console.error('Error adding role:', error);
    }
  };

  const addUser = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const user = await res.json();

      // Map role ID to full role object for immediate display
      const userWithRole = {
        ...user,
        role: roles.find(r => r._id === (user.role._id || user.role)) || { _id: user.role, name: 'Unknown' }
      };

      setUsers([...users, userWithRole]);
      setNewUser({ name: '', email: '', phone: '', password: '', role: '', status: 'Active' });
      setShowUserDialog(false);
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  const editPermission = (permission) => {
    setEditingItem(permission);
    setEditType('permission');
    setNewPermission({ name: permission.name, description: permission.description });
    setShowPermissionDialog(true);
  };

  const editRole = (role) => {
    setEditingItem(role);
    setEditType('role');
    setNewRole({ name: role.name, description: role.description, permissions: role.permissions.map(p => p._id) });
    setShowRoleDialog(true);
  };

  const editUser = (user) => {
    setEditingItem(user);
    setEditType('user');
    setNewUser({ name: user.name, email: user.email, phone: user.phone, password: '', role: user.role._id, status: user.status });
    setShowUserDialog(true);
  };

  const updatePermission = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/permissions/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPermission)
      });
      const updated = await res.json();
      setPermissions(permissions.map(p => p._id === editingItem._id ? updated : p));
      resetForm();
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const updateRole = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/roles/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRole)
      });
      const updated = await res.json();
      setRoles(roles.map(r => r._id === editingItem._id ? { ...updated, userCount: r.userCount } : r));
      resetForm();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const updateUser = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/users/${editingItem._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      const updated = await res.json();
      setUsers(users.map(u => u._id === editingItem._id ? updated : u));
      resetForm();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      setUsers(users.map(u => u._id === userId ? { ...u, status: newStatus } : u));
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const toggleRoleStatus = async (roleId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
      setRoles(roles.map(r => r._id === roleId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error('Error updating role status:', error);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setEditType('');
    setNewPermission({ name: '', description: '' });
    setNewRole({ name: '', description: '', permissions: [] });
    setNewUser({ name: '', email: '', phone: '', password: '', role: '', status: 'Active' });
    setShowPermissionDialog(false);
    setShowRoleDialog(false);
    setShowUserDialog(false);
  };

  const deletePermission = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/permissions/${id}`, { method: 'DELETE' });
      setPermissions(permissions.filter(p => p._id !== id));
    } catch (error) {
      console.error('Error deleting permission:', error);
    }
  };

  const deleteRole = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/roles/${id}`, { method: 'DELETE' });
      setRoles(roles.filter(r => r._id !== id));
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const deleteUser = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/users/${id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u._id !== id));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case "Admin": return "bg-red-100 text-red-800";
      case "Manager": return "bg-yellow-100 text-yellow-800";
      case "Viewer": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    return status === "Active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  };

  // Pagination logic for permissions
  useEffect(() => {
    const startIndex = (permissionsPage - 1) * permissionsPerPage;
    const endIndex = startIndex + permissionsPerPage;
    setPaginatedPermissions(permissions.slice(startIndex, endIndex));
  }, [permissions, permissionsPage, permissionsPerPage]);

  // Pagination logic for roles
  useEffect(() => {
    const startIndex = (rolesPage - 1) * rolesPerPage;
    const endIndex = startIndex + rolesPerPage;
    setPaginatedRoles(roles.slice(startIndex, endIndex));
  }, [roles, rolesPage, rolesPerPage]);

  // Pagination logic for users
  useEffect(() => {
    const startIndex = (usersPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    setPaginatedUsers(users.slice(startIndex, endIndex));
  }, [users, usersPage, usersPerPage]);

  // Pagination handlers
  const handlePermissionsPageChange = (page: number) => setPermissionsPage(page);
  const handlePermissionsPerPageChange = (value: string) => {
    setPermissionsPerPage(parseInt(value));
    setPermissionsPage(1);
  };

  const handleRolesPageChange = (page: number) => setRolesPage(page);
  const handleRolesPerPageChange = (value: string) => {
    setRolesPerPage(parseInt(value));
    setRolesPage(1);
  };

  const handleUsersPageChange = (page: number) => setUsersPage(page);
  const handleUsersPerPageChange = (value: string) => {
    setUsersPerPage(parseInt(value));
    setUsersPage(1);
  };

  // Calculate pagination info
  const permissionsTotalPages = Math.ceil(permissions.length / permissionsPerPage);
  const permissionsStartRecord = permissions.length === 0 ? 0 : (permissionsPage - 1) * permissionsPerPage + 1;
  const permissionsEndRecord = Math.min(permissionsPage * permissionsPerPage, permissions.length);

  const rolesTotalPages = Math.ceil(roles.length / rolesPerPage);
  const rolesStartRecord = roles.length === 0 ? 0 : (rolesPage - 1) * rolesPerPage + 1;
  const rolesEndRecord = Math.min(rolesPage * rolesPerPage, roles.length);

  const usersTotalPages = Math.ceil(users.length / usersPerPage);
  const usersStartRecord = users.length === 0 ? 0 : (usersPage - 1) * usersPerPage + 1;
  const usersEndRecord = Math.min(usersPage * usersPerPage, users.length);

  // Records per page dropdown component
  const RecordsPerPageDropdown = ({ recordsPerPage, onRecordsPerPageChange }) => (
    <div className="flex items-center justify-end mb-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Show</span>
        <Select value={recordsPerPage.toString()} onValueChange={onRecordsPerPageChange}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-600">records</span>
      </div>
    </div>
  );

  // Pagination controls component
  const PaginationControls = ({ currentPage, totalPages, onPageChange, startRecord, endRecord, totalRecords }) => (
    totalRecords > 0 && (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {startRecord} to {endRecord} of {totalRecords} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber;
              if (totalPages <= 5) {
                pageNumber = i + 1;
              } else if (currentPage <= 3) {
                pageNumber = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i;
              } else {
                pageNumber = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    )
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
        <p className="text-gray-600 mt-2">Manage permissions, roles, and user access control</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {/* <TabsTrigger value="permissions">Permissions</TabsTrigger> */}
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Permissions Management</CardTitle>
                <CardDescription>Create and manage system permissions</CardDescription>
              </div>
              <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Permission
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Permission' : 'Add New Permission'}</DialogTitle>
                    <DialogDescription>{editingItem ? 'Update the permission details.' : 'Create a new permission for the system.'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Permission Name</Label>
                      <Input
                        id="name"
                        value={newPermission.name}
                        onChange={(e) => setNewPermission({ ...newPermission, name: e.target.value })}
                        placeholder="e.g., user_read"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={editingItem ? updatePermission : addPermission}>
                      {editingItem ? 'Update Permission' : 'Add Permission'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <PaginationControls
                currentPage={permissionsPage}
                totalPages={permissionsTotalPages}
                onPageChange={handlePermissionsPageChange}
                startRecord={permissionsStartRecord}
                endRecord={permissionsEndRecord}
                totalRecords={permissions.length}
                recordsPerPage={permissionsPerPage}
                onRecordsPerPageChange={handlePermissionsPerPageChange}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead className="text-center">Permission Name</TableHead>

                    <TableHead className="text-center">Created Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <Loader className="w-6 h-6 animate-spin mr-2" />
                          <span>Loading permissions...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : permissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        No permissions found!
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPermissions.map((permission, index) => (
                      <TableRow key={permission._id}>
                        <TableCell className="text-center">{(permissionsPage - 1) * permissionsPerPage + index + 1}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            <Key className="w-3 h-3 mr-1" />
                            {permission.name}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">{new Date(permission.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600" onClick={() => editPermission(permission)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => deletePermission(permission._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={permissionsPage}
                totalPages={permissionsTotalPages}
                onPageChange={handlePermissionsPageChange}
                startRecord={permissionsStartRecord}
                endRecord={permissionsEndRecord}
                totalRecords={permissions.length}
                recordsPerPage={permissionsPerPage}
                onRecordsPerPageChange={handlePermissionsPerPageChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles Management</CardTitle>
                <CardDescription>Create roles by combining permissions</CardDescription>
              </div>
              <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Role
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Role' : 'Add New Role'}</DialogTitle>
                    <DialogDescription>{editingItem ? 'Update the role details and permissions.' : 'Create a new role by combining permissions.'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="roleName">Role Name</Label>
                      <Input
                        id="roleName"
                        value={newRole.name}
                        onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                        placeholder="e.g., Manager"
                      />
                    </div>
                    <div>
                      <Label htmlFor="roleDescription">Description</Label>
                      <Textarea
                        id="roleDescription"
                        value={newRole.description}
                        onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                        placeholder="Describe this role"
                      />
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {permissions.map((permission) => (
                          <div key={permission._id} className="flex items-center space-x-2">
                            <Checkbox
                              id={permission._id}
                              checked={newRole.permissions.includes(permission._id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewRole({ ...newRole, permissions: [...newRole.permissions, permission._id] });
                                } else {
                                  setNewRole({ ...newRole, permissions: newRole.permissions.filter(p => p !== permission._id) });
                                }
                              }}
                            />
                            <Label htmlFor={permission._id}>{permission.name}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={editingItem ? updateRole : addRole}>
                      {editingItem ? 'Update Role' : 'Add Role'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <RecordsPerPageDropdown
                recordsPerPage={rolesPerPage}
                onRecordsPerPageChange={handleRolesPerPageChange}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="text-center">Description</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Created Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <Loader className="w-6 h-6 animate-spin mr-2" />
                          <span>Loading roles...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No roles found!
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRoles.map((role, index) => (
                      <TableRow key={role._id}>
                        <TableCell className="text-center">{(rolesPage - 1) * rolesPerPage + index + 1}</TableCell>
                        <TableCell className="text-center">{role.name}</TableCell>
                        <TableCell className="text-center">{role.description}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {role.permissions.map((permission) => (
                              <Badge key={permission._id} variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                                {permission.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-100 text-green-800">
                            {role.userCount} users
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">{new Date(role.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={role.status !== 'Inactive'}
                            onCheckedChange={() => toggleRoleStatus(role._id, role.status || 'Active')}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600" onClick={() => editRole(role)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteRole(role._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={rolesPage}
                totalPages={rolesTotalPages}
                onPageChange={handleRolesPageChange}
                startRecord={rolesStartRecord}
                endRecord={rolesEndRecord}
                totalRecords={roles.length}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Users Management</CardTitle>
                <CardDescription>Assign roles to users and manage access</CardDescription>
              </div>
              <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit User' : 'Add New User'}</DialogTitle>
                    <DialogDescription>{editingItem ? 'Update the user details and role assignment.' : 'Create a new user and assign a role.'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="userName">Name</Label>
                      <Input
                        id="userName"
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userEmail">Email</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userPhone">Phone</Label>
                      <Input
                        id="userPhone"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div>
                      <Label htmlFor="userPassword">Password</Label>
                      <Input
                        id="userPassword"
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder={editingItem ? "Leave blank to keep current password" : "Enter password"}
                      />
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id="showPassword"
                          checked={showPassword}
                          onCheckedChange={setShowPassword}
                        />
                        <Label htmlFor="showPassword" className="text-sm">Show password</Label>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="userRole">Role</Label>
                      <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role._id} value={role._id}>{role.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="userStatus">Status</Label>
                      <Select value={newUser.status} onValueChange={(value) => setNewUser({ ...newUser, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button onClick={editingItem ? updateUser : addUser}>
                      {editingItem ? 'Update User' : 'Add User'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <RecordsPerPageDropdown
                recordsPerPage={usersPerPage}
                onRecordsPerPageChange={handleUsersPerPageChange}
              />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">#</TableHead>
                    <TableHead className="text-center">User</TableHead>
                    <TableHead className="text-center">Contact</TableHead>
                    <TableHead className="text-center">Role</TableHead>
                    <TableHead className="text-center">Last Login</TableHead>
                    <TableHead className="text-center">Created Date</TableHead>
                    <TableHead className="text-center">Status</TableHead>

                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <Loader className="w-6 h-6 animate-spin mr-2" />
                          <span>Loading users...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No users found!
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user, index) => (
                      <TableRow key={user._id}>
                        <TableCell className="text-center">{(usersPage - 1) * usersPerPage + index + 1}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center space-x-3 justify-center">
                            <div className="relative">

                              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white 
                                }`} />
                            </div>
                            <div>
                              <div className="font-medium">{user.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm justify-center">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm justify-center">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{user.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getRoleColor(user.role?.name)}>
                            {user.role?.name}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</TableCell>
                        <TableCell className="text-center">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={user.status === 'Active'}
                            onCheckedChange={() => toggleUserStatus(user._id, user.status)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex space-x-2 justify-center">
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-600" onClick={() => editUser(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="hover:bg-red-50 hover:text-red-600" onClick={() => deleteUser(user._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={usersPage}
                totalPages={usersTotalPages}
                onPageChange={handleUsersPageChange}
                startRecord={usersStartRecord}
                endRecord={usersEndRecord}
                totalRecords={users.length}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};