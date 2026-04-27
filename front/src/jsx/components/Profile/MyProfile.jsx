import React, { Fragment, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useDispatch, useSelector } from "react-redux";
import PageTitle from "../../layouts/PageTitle";
import { fetchMyProfile, updateMyProfile } from "../../../services/userApi";
import { loginConfirmedAction } from "../../../store/actions/AuthActions";
import { resolveUploadedAssetUrl } from "../../../config/api";

const EMPTY_FORM = {
  userName: "",
  email: "",
  mobileNumber: "",
  dob: "",
  gender: "",
  password: "",
};

export default function MyProfile() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state?.auth?.auth || {});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMyProfile()
      .then((data) => {
        if (!mounted) return;
        setForm({
          userName: data?.userName || "",
          email: data?.email || "",
          mobileNumber: data?.mobileNumber || "",
          dob: data?.dob ? String(data.dob).split("T")[0] : "",
          gender: (data?.gender || "").toLowerCase(),
          password: "",
        });
        setImagePreview(resolveUploadedAssetUrl(data?.imageUrl) || "");
      })
      .catch((err) => {
        if (mounted) setError(err.message || "Failed to load profile.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const validationError = useMemo(() => {
    if (!form.userName.trim()) return "User name is required.";
    if (!form.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email.";
    if (!/^\d{10}$/.test(form.mobileNumber.trim())) return "Mobile number must be 10 digits.";
    if (form.password && form.password.length < 6) return "Password must be at least 6 characters.";
    return "";
  }, [form]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (validationError) {
      Swal.fire({
        icon: "warning",
        title: "Invalid details",
        text: validationError,
        confirmButtonColor: "#6418c3",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        userName: form.userName.trim(),
        email: form.email.trim(),
        mobileNumber: form.mobileNumber.trim(),
        dob: form.dob || null,
        gender: form.gender || null,
      };
      if (form.password) payload.password = form.password;
      if (imageFile) payload.image = imageFile;

      const updated = await updateMyProfile(payload);

      // Keep header name/avatar in sync with edited profile values.
      dispatch(
        loginConfirmedAction({
          ...auth,
          userName: updated?.userName || payload.userName,
          email: updated?.email || payload.email,
          imageUrl: updated?.imageUrl || auth?.imageUrl || "",
        })
      );
      localStorage.setItem(
        "userDetails",
        JSON.stringify({
          ...auth,
          userName: updated?.userName || payload.userName,
          email: updated?.email || payload.email,
          imageUrl: updated?.imageUrl || auth?.imageUrl || "",
        })
      );

      setForm((prev) => ({ ...prev, password: "" }));
      setImageFile(null);
      setImagePreview(resolveUploadedAssetUrl(updated?.imageUrl) || imagePreview);
      Swal.fire({
        icon: "success",
        title: "Profile Updated",
        text: "Your profile has been updated successfully.",
        confirmButtonColor: "#6418c3",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: err.message || "Could not update profile.",
        confirmButtonColor: "#6418c3",
      });
    } finally {
      setSaving(false);
    }
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      Swal.fire({
        icon: "warning",
        title: "Invalid file",
        text: "Only JPG and PNG images are allowed.",
        confirmButtonColor: "#6418c3",
      });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "File too large",
        text: "Image must be smaller than 2 MB.",
        confirmButtonColor: "#6418c3",
      });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <Fragment>
      <PageTitle motherMenu="Profile" activeMenu="My Profile" />
      <div className="row">
        <div className="col-xl-8">
          <div className="card">
            <div className="card-header">
              <h4 className="card-title">My Profile</h4>
            </div>
            <div className="card-body">
              {loading && <div className="text-muted">Loading profile...</div>}
              {!loading && error && <div className="alert alert-danger">{error}</div>}
              {!loading && !error && (
                <form onSubmit={onSubmit}>
                  <div className="form-group mb-3">
                    <label className="text-label">User Name</label>
                    <input className="form-control" name="userName" value={form.userName} onChange={onChange} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-label">Email</label>
                    <input className="form-control" type="email" name="email" value={form.email} onChange={onChange} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-label">Mobile Number</label>
                    <input className="form-control" name="mobileNumber" value={form.mobileNumber} onChange={onChange} maxLength={10} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-label">Date of Birth</label>
                    <input className="form-control" type="date" name="dob" value={form.dob} onChange={onChange} />
                  </div>
                  <div className="form-group mb-3">
                    <label className="text-label">Gender</label>
                    <select className="form-control" name="gender" value={form.gender} onChange={onChange}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group mb-4">
                    <label className="text-label">Profile Image</label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={onImageChange}
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <img
                          src={imagePreview}
                          alt="Profile preview"
                          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: "50%" }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="form-group mb-4">
                    <label className="text-label">New Password (optional)</label>
                    <input
                      className="form-control"
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Updating..." : "Update Profile"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
