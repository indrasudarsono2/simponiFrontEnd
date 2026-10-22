import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadLimitBytes, validateUploadSize } from '../app/utils/uploadSize.ts';
test('client validates add/update limits without blocking metadata-only edits or unknown routes', () => {
  for (const [route,mb] of [['licenseUser',2],['ielpUser',2],['medexUser',2],['competenceUser',2],['logbookUser',4],['mats/questions',2]] as const) {
    for (const suffix of ['', '/123']) {
      const url=`/api/${route}${suffix}`;
      assert.equal(uploadLimitBytes(url),mb*1024*1024);
      const body=new FormData();body.append('file',new Blob([new Uint8Array(mb*1024*1024)]),'boundary.pdf');
      assert.doesNotThrow(()=>validateUploadSize(url,body));
      body.append('second',new Blob([new Uint8Array(mb*1024*1024+1)]),'oversize.pdf');
      assert.throws(()=>validateUploadSize(url,body),{statusCode:413});
    }
  }
  assert.equal(uploadLimitBytes('https://performa.airnavindonesia.co.id/backend/api/logbookUser/1'),4*1024*1024);
  assert.doesNotThrow(()=>validateUploadSize('/api/licenseUser',{note:'unchanged'}));
  assert.equal(uploadLimitBytes('/api/unrelated'),null);
});
