import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { UserContext } from '../context/UserContext'
import { toast } from 'react-toastify'

const UserSignup = () => {
  const navigate = useNavigate()
  const { setUser } = useContext(UserContext)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const submitHandler = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const userData = {
      fullname: {
        firstname: formData.firstName,
        lastname: formData.lastName,
      },
      email: formData.email,
      password: formData.password,
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/user/register`,
        userData,
        { withCredentials: true }
      )

      if (response.status === 201) {
        const { token, user } = response.data.data;
        setUser(user)
        localStorage.setItem('userToken', token)
        toast.success('Account created successfully!')
        navigate('/home')
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create account'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='py-5 px-5 h-screen flex flex-col justify-between'>
      <div>
        <img className='w-16 mb-10' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYQy-OIkA6In0fTvVwZADPmFFibjmszu2A0g&s" alt="User Logo" />
        {error && <p className='text-red-500 mb-4'>{error}</p>}
        <form onSubmit={submitHandler}>
          <h3 className='text-lg font-medium mb-2'>What's your name</h3>
          <div className='flex gap-4 mb-7'>
            <input
              required
              name='firstName'
              value={formData.firstName}
              onChange={handleChange}
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              type='text'
              placeholder='First name'
            />
            <input
              required
              name='lastName'
              value={formData.lastName}
              onChange={handleChange}
              className='bg-[#eeeeee] w-1/2 rounded-lg px-4 py-2 border text-lg placeholder:text-base'
              type='text'
              placeholder='Last name'
            />
          </div>

          <h3 className='text-lg font-medium mb-2'>What's your email</h3>
          <input
            required
            name='email'
            value={formData.email}
            onChange={handleChange}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type='email'
            placeholder='email@example.com'
          />

          <h3 className='text-lg font-medium mb-2'>Enter Password</h3>
          <input
            required
            name='password'
            value={formData.password}
            onChange={handleChange}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg placeholder:text-base'
            type='password'
            placeholder='password'
          />

          <button
            type='submit'
            disabled={loading}
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base disabled:opacity-50'
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className='text-center'>Already have an account? <Link to='/login' className='text-blue-600'>Login here</Link></p>
      </div>
      <div>
        <Link
          to='/captain-signup'
          className='bg-[#10b461] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
        >
          Register as Captain
        </Link>
      </div>
    </div>
  )
}

export default UserSignup;