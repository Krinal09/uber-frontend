import React, { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { toast } from 'react-toastify'

const UserProtectWrapper = ({
    children
}) => {
    const { user, setUser } = useContext(UserContext)
    const navigate = useNavigate()
    const [ isLoading, setIsLoading ] = useState(true)

    console.log('UserProtectWrapper rendering. isLoading:', isLoading, 'user:', user);

    useEffect(() => {
        const token = localStorage.getItem('userToken')

        if (!token) {
            setIsLoading(false)
            navigate('/login')
            return
        }

        if (user) {
            setIsLoading(false)
            return
        }

        const checkAuth = async () => {
            try {
                const response = await api.get('/api/user/profile')

                if (response.status === 200) {
                    setUser(response.data.data.user)
                }
            } catch (error) {
                console.error('Auth check failed:', error)
                localStorage.removeItem('userToken')
                toast.error('Session expired. Please login again.')
                navigate('/login')
            } finally {
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [ user, navigate, setUser ])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    if (user) {
        return (
            <>
                {children}
            </>
        )
    }

    return null
}

export default UserProtectWrapper