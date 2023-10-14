import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Input } from 'antd';
import { copyContentToGithub, setGithubToken } from '@/actions/github';

const Index = () => {
  const [fetching, setFetch] = useState(false);
  const [token, setToken] = useState('');
  const [copyContent, setCopyContent] = useState('hello world copy!');
  useEffect(() => {
    const elem = document.getElementById('copy-content');
    if (!elem) {
      return;
    }
    console.info('run');
    elem.addEventListener('copy', event => {
      const selection = document.getSelection();
      const copyContent = selection?.toString();
      console.info(copyContent);
      event?.preventDefault();
      if (!fetching) {
        setFetch(true);
        copyContentToGithub({ text: copyContent }).then(() => {
          setFetch(false);
        });
      }
    });
  }, []);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const token = event.target.value;
    setToken(token);
    setGithubToken(token);
  }, []);

  return (
    <div>
      <div>
        Github Token:
        <Input type="text" value={token} onChange={handleChange} />
      </div>
      <hr />
      <Input
        value={copyContent}
        onChange={event => {
          setCopyContent(event.target.value);
        }}
      />
      <div id="copy-content">{copyContent}</div>
      {/* <div onClick={() => test('')}>get ref</div> */}
    </div>
  );
};

export default Index;
