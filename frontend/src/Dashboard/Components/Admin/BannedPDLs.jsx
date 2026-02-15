import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Card, Table, Form, InputGroup, Spinner, Alert, Badge, Row, Col, Button, ButtonGroup, Modal } from 'react-bootstrap';
import { Search, User, Download, Eye, Edit2, Unlock } from 'react-feather';
import API_BASE_URL from '../../../config/api';
import { toast } from 'react-toastify';

const BannedPDLs = ({ gender = 'all' }) => {
  const [inmates, setInmates] = useState([]);
  const [selectedGender, setSelectedGender] = useState(gender === 'all' ? 'all' : gender);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditBanModal, setShowEditBanModal] = useState(false);
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);
  const [banFormData, setBanFormData] = useState({
    banReason: '',
    banType: 'temporary',
    banStartDate: new Date().toISOString().split('T')[0],
    banEndDate: '',
    banDuration: '',
    banNotes: ''
  });

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'inmateCode', label: 'Inmate Code' },
    { value: 'crime', label: 'Crime' },
    { value: 'banReason', label: 'Ban Reason' },
    { value: 'banType', label: 'Ban Type' }
  ];

  const fetchBannedInmates = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_BASE_URL}/inmates`);
      const bannedOnly = (response.data || [])
        .filter((inmate) => {
          if (!inmate?.isVisitBanned) return false;
          if (gender === 'all') return true;
          return (inmate?.sex || '').toLowerCase() === gender.toLowerCase();
        })
        .sort((a, b) => {
          const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
          if (lastNameCompare !== 0) return lastNameCompare;
          return (a.firstName || '').localeCompare(b.firstName || '');
        });

      setInmates(bannedOnly);
    } catch (fetchError) {
      console.error('Error fetching banned PDLs:', fetchError);
      setError('Failed to fetch banned PDLs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBannedInmates();
  }, [gender]);

  useEffect(() => {
    if (gender !== 'all') {
      setSelectedGender(gender);
    }
  }, [gender]);

  const getRemainingDuration = (inmate) => {
    if (!inmate?.banEndDate) return 'Permanent';

    const endDate = new Date(inmate.banEndDate);
    if (Number.isNaN(endDate.getTime())) return inmate?.banDuration || 'Unknown';

    const diffMs = endDate.getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';

    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(totalDays / 365);
    const months = Math.floor((totalDays % 365) / 30);
    const weeks = Math.floor(((totalDays % 365) % 30) / 7);
    const days = ((totalDays % 365) % 30) % 7;

    const parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (weeks > 0) parts.push(`${weeks} week${weeks > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(' ') : 'Less than a day';
  };

  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const calculateBanDurationText = (banType, startDateValue, endDateValue) => {
    if (banType === 'permanent') return 'Permanent';
    if (!startDateValue || !endDateValue) return '';

    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
      return '';
    }

    const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays - (years * 365) - (months * 30);

    const parts = [];
    if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);

    if (!parts.length) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }

    return parts.join(' ');
  };

  const openViewModal = (inmate) => {
    setSelectedInmate(inmate);
    setShowViewModal(true);
  };

  const openEditBanModal = (inmate) => {
    const initialBanType = inmate?.banType || 'temporary';
    const initialStartDate = formatDateForInput(inmate?.banStartDate) || new Date().toISOString().split('T')[0];
    const initialEndDate = formatDateForInput(inmate?.banEndDate);

    setSelectedInmate(inmate);
    setBanFormData({
      banReason: inmate?.banReason || '',
      banType: initialBanType,
      banStartDate: initialStartDate,
      banEndDate: initialEndDate,
      banDuration: calculateBanDurationText(initialBanType, initialStartDate, initialEndDate) || inmate?.banDuration || '',
      banNotes: inmate?.banNotes || ''
    });
    setShowEditBanModal(true);
  };

  const handleBanInputChange = (event) => {
    const { name, value } = event.target;

    setBanFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === 'banType' && value === 'permanent') {
        next.banEndDate = '';
      }
      next.banDuration = calculateBanDurationText(next.banType, next.banStartDate, next.banEndDate);
      return next;
    });
  };

  const handleSaveBan = async (event) => {
    event.preventDefault();
    if (!selectedInmate) return;

    if (!banFormData.banReason || !banFormData.banType || !banFormData.banStartDate) {
      toast.error('Please fill in all required ban fields');
      return;
    }

    if (banFormData.banType !== 'permanent' && !banFormData.banEndDate) {
      toast.error('Ban end date is required for non-permanent bans');
      return;
    }

    if (banFormData.banType !== 'permanent') {
      const startDate = new Date(banFormData.banStartDate);
      const endDate = new Date(banFormData.banEndDate);
      if (endDate <= startDate) {
        toast.error('Ban end date must be after start date');
        return;
      }
    }

    const payload = {
      ...banFormData,
      banDuration: calculateBanDurationText(banFormData.banType, banFormData.banStartDate, banFormData.banEndDate) || banFormData.banDuration
    };

    setIsSubmittingBan(true);
    try {
      await axios.put(`${API_BASE_URL}/inmates/${selectedInmate.inmateCode}/visit-ban`, payload);
      toast.success('PDL visit ban updated successfully');
      setShowEditBanModal(false);
      await fetchBannedInmates();
    } catch (saveError) {
      toast.error(saveError.response?.data?.message || 'Failed to update PDL visit ban');
    } finally {
      setIsSubmittingBan(false);
    }
  };

  const handleRemoveBan = async (inmate) => {
    if (!window.confirm(`Remove visit ban for ${inmate.fullName || inmate.inmateCode}?`)) {
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/inmates/${inmate.inmateCode}/remove-visit-ban`);
      toast.success('PDL visit ban removed');
      await fetchBannedInmates();
    } catch (removeError) {
      toast.error(removeError.response?.data?.message || 'Failed to remove PDL visit ban');
    }
  };

  const filteredInmates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = [...inmates];

    if (selectedGender !== 'all') {
      filtered = filtered.filter((inmate) => (inmate?.sex || '').toLowerCase() === selectedGender.toLowerCase());
    }

    if (!query) return filtered;

    return filtered.filter((inmate) => {
      const value = inmate?.[searchBy]?.toString().toLowerCase() || '';
      return value.includes(query);
    });
  }, [inmates, searchQuery, searchBy, selectedGender]);

  const isGenderRestricted = gender !== 'all';

  const exportToCSV = () => {
    if (!filteredInmates.length) return;

    const headers = [
      'Inmate Code',
      'Full Name',
      'Sex',
      'Crime',
      'Ban Type',
      'Duration',
      'Reason',
      'Notes'
    ];

    const escapeCSVValue = (value) => {
      const safeValue = value == null ? '' : String(value);
      return `"${safeValue.replace(/"/g, '""')}"`;
    };

    const rows = filteredInmates.map((inmate) => [
      inmate.inmateCode || 'N/A',
      inmate.fullName || `${inmate.lastName || ''}, ${inmate.firstName || ''}`.trim(),
      inmate.sex || 'N/A',
      inmate.crime || 'N/A',
      inmate.banType || 'N/A',
      getRemainingDuration(inmate),
      inmate.banReason || 'No reason provided',
      inmate.banNotes || '-'
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCSVValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];

    link.href = url;
    link.setAttribute('download', `banned-pdls-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2 className="white-title" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: '600' }}>
            🚫 Banned PDL List
          </h2>
          <Badge bg="danger" className="mb-2">
            Visitation Blocked
          </Badge>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={exportToCSV} disabled={!filteredInmates.length}>
            <Download size={16} className="me-1" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card
        style={{
          backgroundColor: '#676767a7',
          borderRadius: '12px',
          marginBottom: '20px',
          borderLeft: '4px solid #0d6efd',
          borderRight: '4px solid #0d6efd'
        }}
      >
        <Card.Body>
          <Row className="align-items-center">
            <Col md={6}>
              <div className="d-flex gap-2 align-items-center">
                <span className="fw-bold me-2" style={{ color: '#0d47a1' }}>Filter by Gender:</span>
                <ButtonGroup>
                  <Button
                    variant={selectedGender === 'all' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => !isGenderRestricted && setSelectedGender('all')}
                    style={{color: selectedGender === 'all' ? '#ffffff' : '#0d47a1'}}
                    disabled={isGenderRestricted}
                  >
                    <User size={14} className="me-1" />
                    All
                  </Button>
                  <Button
                    variant={selectedGender === 'male' ? 'primary' : 'outline-primary'}
                    size="sm"
                    onClick={() => setSelectedGender('male')}
                    style={{color: selectedGender === 'male' ? '#ffffff' : '#0d47a1'}}
                    disabled={isGenderRestricted && gender !== 'male'}
                  >
                    Male
                  </Button>
                  <Button
                    variant={selectedGender === 'female' ? 'danger' : 'outline-danger'}
                    size="sm"
                    onClick={() => setSelectedGender('female')}
                    sstyle={{color: selectedGender === 'female' ? '#ffffff' : '#0d47a1'}}
                    disabled={isGenderRestricted && gender !== 'female'}
                  >
                    Female
                  </Button>
                </ButtonGroup>
              </div>
            </Col>

            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={16} color="black" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search PDL..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="border-start-0"
                />
                <Form.Select
                  value={searchBy}
                  onChange={(event) => setSearchBy(event.target.value)}
                  className="bg-white"
                  style={{ maxWidth: '150px', color: '#0d47a1' }}
                >
                  {searchOptions.map((option) => (
                    <option key={option.value} value={option.value} style={{ color: '#0d47a1' }}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
          </Row>

          <Row className="mt-2">
            <Col>
              <div style={{ color: '#ffffffff', fontWeight: '500', textAlign: 'right' }}>
                Showing {filteredInmates.length} PDL{selectedGender !== 'all' ? ` (${selectedGender} only)` : ''}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0">
        <Card.Body>

          {error && <Alert variant="danger">{error}</Alert>}

          {isLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" role="status" />
              <p className="mt-2 mb-0">Loading banned PDL list...</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover responsive className="bg-white align-middle mb-0">
                <thead className="table-primary">
                  <tr>
                    <th>Inmate Code</th>
                    <th>Full Name</th>
                    <th>Sex</th>
                    <th>Crime</th>
                    <th>Ban Type</th>
                    <th>Duration</th>
                    <th>Reason</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInmates.length > 0 ? (
                    filteredInmates.map((inmate) => (
                      <tr key={inmate._id || inmate.inmateCode}>
                        <td>{inmate.inmateCode || 'N/A'}</td>
                        <td>{inmate.fullName || `${inmate.lastName || ''}, ${inmate.firstName || ''}`}</td>
                        <td>{inmate.sex || 'N/A'}</td>
                        <td>{inmate.crime || 'N/A'}</td>
                        <td className="text-capitalize">{inmate.banType || 'N/A'}</td>
                        <td>{getRemainingDuration(inmate)}</td>
                        <td>{inmate.banReason || 'No reason provided'}</td>
                        <td>{inmate.banNotes || '-'}</td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            <Button variant="outline-info" size="sm" onClick={() => openViewModal(inmate)} title="View">
                              <Eye size={14} />
                            </Button>
                            <Button variant="outline-primary" size="sm" onClick={() => openEditBanModal(inmate)} title="Edit Ban">
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="outline-danger" size="sm" onClick={() => handleRemoveBan(inmate)} title="Remove Visit Ban">
                              <Unlock size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-4">
                        No banned PDLs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Banned PDL Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInmate && (
            <>
              <p className="mb-1"><strong>Inmate Code:</strong> {selectedInmate.inmateCode || 'N/A'}</p>
              <p className="mb-1"><strong>Full Name:</strong> {selectedInmate.fullName || `${selectedInmate.lastName || ''}, ${selectedInmate.firstName || ''}`}</p>
              <p className="mb-1"><strong>Sex:</strong> {selectedInmate.sex || 'N/A'}</p>
              <p className="mb-1"><strong>Crime:</strong> {selectedInmate.crime || 'N/A'}</p>
              <p className="mb-1"><strong>Ban Type:</strong> {selectedInmate.banType || 'N/A'}</p>
              <p className="mb-1"><strong>Remaining Duration:</strong> {getRemainingDuration(selectedInmate)}</p>
              <p className="mb-1"><strong>Reason:</strong> {selectedInmate.banReason || 'No reason provided'}</p>
              <p className="mb-0"><strong>Notes:</strong> {selectedInmate.banNotes || '-'}</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditBanModal} onHide={() => setShowEditBanModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Visit Ban</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveBan}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Ban Reason *</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="banReason"
                value={banFormData.banReason}
                onChange={handleBanInputChange}
                required
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ban Type *</Form.Label>
                  <Form.Select name="banType" value={banFormData.banType} onChange={handleBanInputChange} required>
                    <option value="temporary">Temporary</option>
                    <option value="permanent">Permanent</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Ban Start Date *</Form.Label>
                  <Form.Control
                    type="date"
                    name="banStartDate"
                    value={banFormData.banStartDate}
                    onChange={handleBanInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {banFormData.banType !== 'permanent' && (
              <Form.Group className="mb-3">
                <Form.Label>Ban End Date *</Form.Label>
                <Form.Control
                  type="date"
                  name="banEndDate"
                  value={banFormData.banEndDate}
                  onChange={handleBanInputChange}
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Ban Duration</Form.Label>
              <Form.Control value={banFormData.banDuration || (banFormData.banType === 'permanent' ? 'Permanent' : '')} readOnly />
            </Form.Group>

            <Form.Group>
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="banNotes"
                value={banFormData.banNotes}
                onChange={handleBanInputChange}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditBanModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmittingBan}>
              {isSubmittingBan ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default BannedPDLs;
