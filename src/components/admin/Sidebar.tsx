import {
  LayoutDashboard,
  Car,
  Users,
  MapPin,
  Shield,
  Tags,
  FolderTree,
  Truck,
  Calculator,
  Clock,
  BookOpen,
  UserCheck,
  Package,
  Bike,
  Gift,
  Layers3,
  Map,
  Building,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Wallet,
  CheckCircle,
  XCircle,
  FileText,
  Ban,
  Star
} from "lucide-react";
import { RupeeIcon } from "@/components/ui/RupeeIcon";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../lib/axiosInterceptor";

interface SidebarProps {
  isOpen: boolean;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Bike, label: "Rides", path: "/all-rides" },
  {
    icon: Users,
    label: "Users Management",
    key: "users-management",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "Users", path: "/users" },
      { icon: Clock, label: "Pending Withdrawal Requests", path: "/rider-pending-withdrawals" },
      { icon: CheckCircle, label: "Approved Withdrawal Requests", path: "/rider-approved-withdrawals" },
      { icon: XCircle, label: "Rejected Withdrawal Requests", path: "/rider-rejected-withdrawals" },
      { icon: Wallet, label: "Rider Wallet Config", path: "/rider-wallet-config" }
    ]
  },
  {
    icon: UserCheck,
    label: "Drivers Management",
    key: "drivers-management",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "Drivers", path: "/drivers", key: "drivers-all" },
      { icon: Ban, label: "Suspend Driver", path: "/suspend-driver" }
    ]
  },
  {
    icon: MapPin,
    label: "State and City Management",
    key: "location-management",
    isDropdown: true,
    subItems: [
      { icon: Map, label: "States", path: "/states" },
      { icon: Building, label: "Cities", path: "/cities" }
    ]
  },
  { icon: Tags, label: "Category", path: "/category" },
  { icon: FolderTree, label: "Sub Category", path: "/subcategory" },
  { icon: Layers3, label: "Sub-Sub Category", path: "/subsubcategory" },
  {
    icon: Users,
    label: "Driver Category Management",
    key: "driver-category-management",
    isDropdown: true,
    subItems: [
      { icon: Bike, label: "Driver Vehicle Type", path: "/drivervehicletype" },
      { icon: Truck, label: "Vehicle Category", path: "/vehiclecategory" },
      { icon: RupeeIcon, label: "Driver Category", path: "/drivercategory" },
      { icon: Calculator, label: "Driver Packages", path: "/DriverRidecost" }
    ]
  },
  {
    icon: Car,
    label: "Cab Category Management",
    key: "cab-category-management",
    isDropdown: true,
    subItems: [
      { icon: Tags, label: "Cab Category", path: "/carcategory" },
      { icon: Truck, label: "Vehicle Type", path: "/vehicletype" },
      { icon: Car, label: "Cab Management", path: "/carmanagement" },
      { icon: Calculator, label: "Cab Packages", path: "/cabridecost" }
    ]
  },
  {
    icon: Package,
    label: "Parcel Category Management",
    key: "parcel-category-management",
    isDropdown: true,
    subItems: [
      { icon: Tags, label: "Parcel Category", path: "/parcelcategory" },
      { icon: Truck, label: "Parcel Vehicle Type", path: "/parcelvehicletype" },
      { icon: Truck, label: "Parcel Vehicle Management", path: "/parcelvehicleManagement" },
      { icon: Calculator, label: "Parcel Packages", path: "/parcelridecost" }
    ]
  },
  { icon: Truck, label: "Vehicle Management", path: "/approved-vehicles" },
  { icon: Clock, label: "Peak and Night Charges Management", path: "/peakhours" },
  { icon: BookOpen, label: "T & C", path: "/t&c" },
  { icon: Gift, label: "Refer Earn", path: "/UserReferearn" },
  {
    icon: Wallet,
    label: "Driver Wallet & Payments Management",
    key: "payments-management",
    isDropdown: true,
    subItems: [
      { icon: Clock, label: "Pending Withdrawal Requests", path: "/pending-withdrawals" },
      { icon: CheckCircle, label: "Completed Withdrawal Requests", path: "/completed-withdrawals" },
      { icon: XCircle, label: "Rejected Withdrawal Requests", path: "/rejected-withdrawals" },
      { icon: CreditCard, label: "Driver Transactions", path: "/driver-transactions" },
      { icon: Wallet, label: "Min Withdrawal Balance", path: "/min-withdraw-balance" },
      { icon: Calculator, label: "Service Wise Min Wallet Balance", path: "/service-wallet-balance" },
      { icon: Gift, label: "Driver Incentives", path: "/driver-incentives" }
    ]
  },
  {
    icon: Ban,
    label: "Driver Cancellation Credits Management",
    key: "driver-cancellation-credits",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "All Drivers", path: "/all-drivers-credits" },
      { icon: CreditCard, label: "Manage Driver Credits", path: "/manage-driver-credits" }
    ]
  },
  {
    icon: Star,
    label: "Ratings Management",
    key: "ratings-management",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "User Ratings", path: "/user-ratings" },
      { icon: UserCheck, label: "Driver Ratings", path: "/driver-ratings" }
    ]
  },
  {
    icon: Users,
    label: "Offline Booking Management",
    key: "offline-booking-management",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "Staff Management", path: "/create-offline-staff" }
    ]
  },
  { icon: Wallet, label: "Admin Wallet Management", path: "/admin-wallet-ledger" },
  { icon: Shield, label: "Role Management", path: "/rolemanagement" },
  { icon: CreditCard, label: "Driver Subscription & Registration fee management", path: "/driversubscription" },
  { icon: FileText, label: "Driver Purchased Plans History", path: "/driver-purchased-plans" },
];

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const Sidebar = ({ isOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const response = await apiClient.get(`${import.meta.env.VITE_API_URL}/api/auth/permissions`);
        setUserPermissions(response.data.permissions);
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  // Determine if a path is active based on current location
  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  // Determine if any sub-item in a dropdown is active
  const isDropdownActive = (subItems: { path: string }[]) => {
    return subItems.some(sub => isActive(sub.path));
  };

  // Auto-open dropdown if a sub-item is active
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.isDropdown && item.subItems) {
        if (isDropdownActive(item.subItems)) {
          setOpenDropdowns(prev => ({ ...prev, [item.key!]: true }));
        }
      }
    });
  }, [location.pathname]);

  const filteredMenuItems = menuItems.filter(item => {
    const key = item.key || (item as any).path?.replace('/', '');
    if (userPermissions.includes(key)) return true;
    if (item.subItems) {
      return item.subItems.some(sub => {
        const subKey = (sub as any).key || sub.path.replace('/', '');
        return userPermissions.includes(subKey);
      });
    }
    return false;
  }).map(item => {
    if (item.subItems) {
      const key = item.key || (item as any).path?.replace('/', '');
      // If parent has permission, show all subitems. Otherwise filter by individual item permissions
      const hasParentPermission = userPermissions.includes(key);
      return {
        ...item,
        subItems: hasParentPermission 
          ? item.subItems 
          : item.subItems.filter(sub => {
              const subKey = (sub as any).key || sub.path.replace('/', '');
              return userPermissions.includes(subKey);
            })
      };
    }
    return item;
  });

  const toggleDropdown = (key: string) => {
    setOpenDropdowns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/Logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-lg font-bold text-black">Hire4Drive</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 overflow-y-auto" style={{ height: 'calc(100vh - 88px)', paddingBottom: '2rem' }}>
        {filteredMenuItems.map((item, index) => (
          <div key={index}>
            {item.isDropdown ? (
              <>
                <button
                  onClick={() => toggleDropdown(item.key!)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                    "text-black hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {openDropdowns[item.key!] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
                {isOpen && openDropdowns[item.key!] && item.subItems && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.subItems.map((subItem, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => navigate(subItem.path)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm",
                          isActive(subItem.path)
                            ? "bg-blue-600 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        )}
                      >
                        <subItem.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left">{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate((item as any).path)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                  isActive((item as any).path)
                    ? "bg-blue-600 text-white"
                    : "text-black hover:bg-gray-100"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span className="flex-1 text-left">{item.label}</span>}
              </button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};