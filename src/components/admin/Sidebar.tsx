import { 
  LayoutDashboard, 
  Car, 
  Users, 
  MapPin, 
  Shield,
  Tags,
  FolderTree,
  Truck,
  DollarSign,
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
  CreditCard
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
  isOpen: boolean;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "dashboard" },
  {
    icon: MapPin,
    label: "State and City Management",
    key: "location-management",
    isDropdown: true,
    subItems: [
      { icon: Map, label: "States", key: "states" },
      { icon: Building, label: "Cities", key: "cities" }
    ]
  },
  { icon: Tags, label: "Category", key: "category" },
  { icon: FolderTree, label: "Sub Category", key: "subcategory" },
  { icon: Layers3, label: "Sub-Sub Category", key: "subsubcategory" },
  {
    icon: Users,
    label: "Driver Category Management",
    key: "driver-category-management",
    isDropdown: true,
    subItems: [
      { icon: Truck, label: "Vehicle Category", key: "vehiclecategory" },
      { icon: DollarSign, label: "Driver Category", key: "pricecategory" },
      { icon: Calculator, label: "Driver Ride Cost Management", key: "ridecost" }
    ]
  },
  {
    icon: Car,
    label: "Cab Category Management",
    key: "cab-category-management",
    isDropdown: true,
    subItems: [
      { icon: Tags, label: "Cab Category", key: "carcategory" },
      { icon: Car, label: "Cab Management", key: "carmanagement" },
      { icon: Calculator, label: "Cab Ride Cost Management", key: "cabridecost" }
    ]
  },
  {
    icon: Package,
    label: "Parcel Category Management",
    key: "parcel-category-management",
    isDropdown: true,
    subItems: [
      { icon: Tags, label: "Parcel Category", key: "parcelcategory" },
      { icon: Truck, label: "Parcel Vehicle Management", key: "parcelvehicletypes" },
      { icon: Calculator, label: "Parcel Ride Cost Management", key: "parcelridecost" }
    ]
  },
  { icon: Clock, label: "Peak Hours / Peak Dates", key: "peakhours" },
  {
    icon: UserCheck,
    label: "Drivers Management",
    key: "drivers-management",
    isDropdown: true,
    subItems: [
      { icon: Users, label: "OnReview Registration Requests", key: "drivers-onreview" }
    ]
  },
  { icon: BookOpen, label: "T & C", key: "t&c" },
  { icon: Bike, label: "Rides", key: "rides" },
  { icon: Gift, label: "Refer Earn", key: "referearn" },
  { icon: Shield, label: "Role Management", key: "rolemanagement" },
  { icon: CreditCard, label: "Driver Subscription & Registration fee management", key: "driversubscription" }
];

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

export const Sidebar = ({ isOpen, activeSection, onSectionChange }: SidebarProps) => {
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: string]: boolean }>({});
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) return;

        const response = await fetch('http://localhost:5000/api/auth/permissions', {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserPermissions(data.permissions);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };

    fetchPermissions();
  }, []);

  const filteredMenuItems = menuItems.filter(item => {
    if (userPermissions.includes('all')) {
      return true;
    }
    return userPermissions.includes(item.key);
  });

  useEffect(() => {
    if (userPermissions.length > 0 && filteredMenuItems.length > 0 && !activeSection) {
      const firstItem = filteredMenuItems[0];
      if (firstItem.isDropdown && firstItem.subItems) {
        onSectionChange(firstItem.subItems[0].key);
      } else {
        onSectionChange(firstItem.key);
      }
    }
  }, [userPermissions, filteredMenuItems, onSectionChange, activeSection]);

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
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          {isOpen && (
            <div>
              <h1 className="text-lg font-bold text-black">DriveGo</h1>
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
                  onClick={() => toggleDropdown(item.key)}
                  className={cn(
                    "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                    "text-black hover:bg-gray-100"
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isOpen && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {openDropdowns[item.key] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </>
                  )}
                </button>
                {isOpen && openDropdowns[item.key] && item.subItems && (
                  <div className="ml-6 mt-2 space-y-1">
                    {item.subItems.map((subItem, subIndex) => (
                      <button
                        key={subIndex}
                        onClick={() => onSectionChange(subItem.key)}
                        className={cn(
                          "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm",
                          activeSection === subItem.key
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
                onClick={() => onSectionChange(item.key)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer",
                  activeSection === item.key
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

// Demo usage
export default function App() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isOpen} 
        activeSection={activeSection} 
        onSectionChange={setActiveSection}
      />
      
      {/* Main content area */}
      <div className={cn("transition-all duration-300", isOpen ? "ml-64" : "ml-16")}>
        <div className="p-8">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Toggle Sidebar
          </button>
          
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Active Section: {activeSection}
            </h2>
            <p className="text-gray-600">
              Click on sidebar items to navigate. The sidebar now properly scrolls without cutting off menu items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}