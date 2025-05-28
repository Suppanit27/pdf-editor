import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800">
      <div className=" text-white py-4">
        <div className="container mx-auto text-center">
          <p>
            {/* &copy; {new Date().getFullYear()} Your Company Name. All rights
            reserved. */}
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
