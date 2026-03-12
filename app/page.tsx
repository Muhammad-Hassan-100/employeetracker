import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, Calendar, Shield, BarChart2, Fingerprint, Smartphone, Cloud } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 overflow-x-hidden">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">EmployeeTracker</span>
          </div>
          <div className="flex items-center">
            <Link href="/login">
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm">
                Login
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-sm font-medium mb-4">
            <span>Custom Workforce Solution</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Employee Management System <span className="text-blue-600">for Glidrone</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            A custom-built workforce management solution designed specifically for Glidrone's operations to streamline processes and increase productivity.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Features Tailored for Glidrone</h2>
          <p className="text-xl text-gray-600">
            Custom solutions designed specifically for Glidrone's workforce needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: <Clock className="h-8 w-8 text-blue-600" />,
              title: "Time Tracking",
              description: "Accurate clock-in/out system with geofencing and verification."
            },
            {
              icon: <Calendar className="h-8 w-8 text-green-600" />,
              title: "Shift Planning",
              description: "Intuitive scheduling designed for Glidrone's operational needs."
            },
            {
              icon: <BarChart2 className="h-8 w-8 text-purple-600" />,
              title: "Analytics Dashboard",
              description: "Insights into workforce productivity and attendance patterns."
            },
            {
              icon: <Fingerprint className="h-8 w-8 text-red-600" />,
              title: "Access Control",
              description: "Custom permission system for Glidrone's organizational structure."
            },
            {
              icon: <Smartphone className="h-8 w-8 text-yellow-600" />,
              title: "Mobile App",
              description: "Mobile experience for Glidrone employees and managers."
            },
            {
              icon: <Cloud className="h-8 w-8 text-indigo-600" />,
              title: "Cloud Platform",
              description: "Secure access to Glidrone's workforce data from anywhere."
            }
          ].map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">About This Project</h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                This Employee Management System is a personal project developed by <span className="font-semibold text-blue-600"></span> specifically for Glidrone's internal use. It's not a commercial product but a custom solution built to address Glidrone's specific workforce management requirements.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed">
                The system was designed with Glidrone's operational workflows in mind, ensuring optimal efficiency and usability for their specific context.
              </p>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="font-medium text-gray-900 mb-3">Developer Note</h3>
                <p className="text-gray-600">
                  "This project represents my personal contribution to improving Glidrone's operations. While working at Glidrone, I identified opportunities to streamline workforce management and developed this solution accordingly."
                </p>
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
                <h3 className="text-2xl font-bold mb-4">Project Highlights</h3>
                <ul className="space-y-4">
                  {[
                    "Custom-built for Glidrone's specific needs",
                    "Secure infrastructure tailored to their requirements",
                    "Direct support from the developer",
                    "Continuous improvements based on feedback",
                    "Designed to integrate with Glidrone's workflows",
                    "Compliance with Glidrone's operational policies"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-5 w-5 text-green-300 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-12 shadow-sm border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Access Glidrone's Employee System</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            This system is exclusively for authorized Glidrone personnel.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="bg-blue-600 p-1.5 rounded">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white">EmployeeTracker</span>
          </div>
          <p className="text-gray-400 text-sm mb-1">A custom solution developed for Glidrone</p>
          <p className="text-gray-500 text-xs">© {new Date().getFullYear()}Project for Glidrone. Not a commercial product.</p>
        </div>
      </footer>
    </div>
  );
}
