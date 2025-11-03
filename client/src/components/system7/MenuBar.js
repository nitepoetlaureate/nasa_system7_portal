import React, { useState, useEffect, useRef } from 'react';

const Menu = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    // Close menu if clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div ref={ref} className="relative">
            <div 
                className={`px-2 ${isOpen ? 'bg-black text-white' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {title}
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 bg-s7-gray border-2 border-t-white border-l-white border-b-black border-r-black mt-[-2px] ml-[-2px] min-w-[150px] shadow-s7-window">
                    {children}
                </div>
            )}
        </div>
    );
};

const MenuItem = ({ children }) => (
    <div className="px-3 py-0.5 hover:bg-black hover:text-white">{children}</div>
);

const MenuBar = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }, 1000 * 30); // Update every 30 seconds
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="absolute top-0 left-0 right-0 h-6 bg-s7-gray border-b-2 border-black flex items-center justify-between px-1 font-chicago text-black select-none z-50">
            <div className="flex">
                <Menu title="">
                    <MenuItem>About This Portal...</MenuItem>
                </Menu>
                <Menu title="File">
                    <MenuItem>New Window</MenuItem>
                    <MenuItem>Close Window</MenuItem>
                </Menu>
                <Menu title="Edit">
                    <MenuItem>Undo</MenuItem>
                    <MenuItem>Cut</MenuItem>
                    <MenuItem>Copy</MenuItem>
                    <MenuItem>Paste</MenuItem>
                </Menu>
            </div>
            <div>
                {time}
            </div>
        </div>
    );
};

export default MenuBar;
