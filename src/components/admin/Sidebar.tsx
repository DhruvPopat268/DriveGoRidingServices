
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  MapPin, 
  BarChart3, 
  Settings, 
  HeadphonesIcon,
  Wallet,
  Bell,
  Shield,
  Tags,
  FolderTree,
  Truck,
  DollarSign,
  Calculator,
  Clock,
  BookOpen,
  UserCheck,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  { icon: Tags, label: "Category", key: "category" },
  { icon: FolderTree, label: "Sub Category", key: "subcategory" },
  { icon: Truck, label: "Vehicle Category", key: "vehiclecategory" },
  { icon: DollarSign, label: "Price Category", key: "pricecategory" },
  { icon: Calculator, label: "Ride Cost", key: "ridecost" },
  { icon: Clock, label: "Peak Hours / Peak Dates", key: "peakhours" },
  { icon: BookOpen, label: "T & C", key: "instructions" },
  { icon: UserCheck, label: "Driver Calculation Model", key: "drivercalculation" },
  { icon: Car, label: "Cab Calculation Model", key: "cabcalculation" },
  { icon: Package, label: "Parcel Calculation Model", key: "parcelcalculation" },
];

export const Sidebar = ({ isOpen, activeSection, onSectionChange }: SidebarProps) => {
  return (
    <div className={cn(
      "fixed left-0 top-0 h-full bg-gray-800 dark:bg-gray-800 bg-white border-r border-gray-700 dark:border-gray-700 border-gray-200 transition-all duration-300 z-40",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700 dark:border-gray-700 border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-lg font-bold text-white dark:text-white text-gray-900">RideAdmin</h1>
              <p className="text-xs text-gray-400 dark:text-gray-400 text-gray-500">Admin Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => onSectionChange(item.key)}
            className={cn(
              "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
              activeSection === item.key
                ? "bg-blue-600 text-white" 
                : "text-gray-300 dark:text-gray-300 text-gray-600 hover:bg-gray-700 dark:hover:bg-gray-700 hover:bg-gray-100 hover:text-white dark:hover:text-white hover:text-gray-900"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {isOpen && (
              <span className="flex-1 text-left">{item.label}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};
