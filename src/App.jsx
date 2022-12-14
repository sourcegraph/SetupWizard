import { useCallback, useState, useEffect } from 'react';
import './App.css';
import { teardownWizard, makeRequest } from './helpers';
import logo from './logo.svg';

function App() {
  const [hostname, setHostname] = useState(null);
  const [size, setSize] = useState('XS');
  const [mode, setMode] = useState('new');
  const [version, setVersion] = useState('');
  const [fileName, setFileName] = useState(null);
  const [blob, setBlob] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [showErrors, setShowErrors] = useState(null);
  useEffect(() => {
    if (!hostname) {
      const uri = new URL(window.location.origin);
      setHostname(uri.hostname);
    }
    if (blob && fileName) {
      setUploadStatus({
        [fileName]: 'Uploading',
      });
      const postRequest = makeRequest('POST', blob);
      try {
        fetch(
          `http://${hostname}:30080/.api/upload?file=${fileName}`,
          postRequest
        )
          .then((res) => res.json())
          .then((res) => {
            console.log(res);
            setUploadStatus({
              [fileName]: res.body,
            });
          })
          .catch((error) => {
            throw error;
          });
      } catch (error) {
        setShowErrors(error);
        setUploadStatus({
          [fileName]: 'Failed',
        });
      }
    }
  }, [blob, fileName, hostname]);

  const onFileChange = useCallback(async (file, uploadName) => {
    const reader = new FileReader();
    reader.onloadstart = () =>
      setUploadStatus({
        [uploadName]: 'loading',
      });
    reader.onload = (event) => setBlob(event.target.result);
    const getFileName = await file.name;
    if (uploadName !== getFileName) {
      setUploadStatus({
        [uploadName]: `Failed: file name must be ${uploadName}`,
      });
    } else {
      setFileName(uploadName || getFileName);
      reader.readAsText(file, 'UTF-8');
    }
  }, []);

  const onLaunchClick = useCallback(
    (e) => {
      e.preventDefault();
      setSubmitted(true);
      const requestBody = {
        size: size,
        version: version,
      };
      const postRequest = makeRequest('POST', JSON.stringify(requestBody));
      function checkFrontend(tries) {
        if (tries > 0) {
          fetch(`http://${hostname}:30080/.api/check`)
            .then((res) => res.json())
            .then((res) => {
              if (res === 'Ready') {
                teardownWizard(hostname);
              } else {
                setTimeout(() => {
                  tries--;
                  checkFrontend(tries);
                }, '10000');
              }
            })
            .catch((error) => {
              throw error;
            });
        }
        throw new Error(
          'Instance set up timeout. Please contact our support for further assistance.'
        );
      }
      // Launch as new instance or upgrade
      try {
        fetch(
          `http://${hostname}:30080/.api/${mode}?size=${size}&version=${version}`,
          postRequest
        )
          .then((res) => res.json())
          .then((res) => {
            checkFrontend(20);
            setSubmitted(true);
            const responseText = res.toString();
            if (responseText.startWith('Failed')) {
              setShowErrors(res);
              setSubmitted(false);
            }
          })
          .catch((error) => {
            throw new Error(error);
          });
      } catch (error) {
        setSubmitted(false);
        setShowErrors(error);
      }
    },
    [hostname, mode, size, version]
  );

  return (
    <div className="container" role="main">
      <div className="homepage">
        <img alt="sourcegraph logo" src={logo} className="logo-big" />
        <h1>Sourcegraph Image Instance Setup Wizard</h1>
        {submitted ? (
          <div className="loading">
            <div className="settings">
              <div class="loading-zone">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
              <h4>Your instance is being set up...</h4>
              <h5>You will be redirected to the login page automatically.</h5>
            </div>
          </div>
        ) : (
          <div className="settings">
            <label>
              <h4 className="subtitle">Select your instance size*</h4>
              <select
                onChange={(e) => setSize(e.target.value)}
                className="input"
              >
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </label>
            <label>
              <h4 className="subtitle">Select instance launch mode*</h4>
              <select
                onChange={(e) => setMode(e.target.value)}
                className="input"
              >
                <option value="new">New - Launch a new instance</option>
                <option value="upgrade">
                  Upgrade - Upgrade existing instance
                </option>
              </select>
            </label>
            {mode === 'upgrade' ? (
              <label>
                <h4 className="subtitle">Enter a version number for upgrade</h4>
                <input
                  type="text"
                  onChange={(e) => setVersion(e.target.value)}
                  className="input"
                  placeholder="Example: 4.1.3"
                />
              </label>
            ) : (
              <label className="file">
                <h4 className="subtitle">
                  Optional: Code host SSH file - id_rsa
                </h4>
                <h5 className="error">
                  {uploadStatus &&
                    uploadStatus.id_rsa &&
                    'Status: ' + uploadStatus.id_rsa}
                </h5>
                <input
                  className=""
                  name="id_rsa"
                  type="file"
                  onChange={(e) =>
                    onFileChange(e.target.files[0], e.target.name)
                  }
                />
                <h4 className="subtitle">
                  Optional: Code host SSH file - known_hosts
                </h4>
                <h5 className="error">
                  {uploadStatus &&
                    uploadStatus.known_hosts &&
                    'Status: ' + uploadStatus.known_hosts}
                </h5>
                <input
                  className=""
                  name="known_hosts"
                  type="file"
                  onChange={(e) =>
                    onFileChange(e.target.files[0], e.target.name)
                  }
                />
              </label>
            )}
            {showErrors && <h5 className="error">ERROR: {showErrors}</h5>}
            <div className="m-5">
              <input
                className="btn-next"
                type="button"
                value={submitted ? 'LOADING' : 'LAUNCH'}
                disabled={submitted}
                onClick={(e) => onLaunchClick(e)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
