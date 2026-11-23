---
title: "Arrow 26.0.1 Upgrade Guide: The Brotli CVE and Bundled Dependencies in PyArrow Wheels"
description: "Apache Arrow 26.0.1 patches the Brotli library bundled in PyArrow wheels for CVE-2026-111497. Learn who is exposed, how to verify, and how to roll it out."
pubDatetime: 2026-11-23T09:00:00Z
author: "Alex Merced"
category: "Data Engineering"
tags:
  - Apache Arrow
  - PyArrow
  - CVE
  - supply chain security
  - dependency upgrades
slug: "arrow-26-0-1-upgrade-brotli-cve"
draft: false
canonicalURL: https://datalakehousehub.com/blog/arrow-26-0-1-upgrade-brotli-cve/
---

> **Cross-posted.** This article's canonical home is [Data Lakehouse Hub](https://datalakehousehub.com/blog/arrow-26-0-1-upgrade-brotli-cve/).

Apache Arrow 26.0.1, released November 3, 2026, is mainly a security patch. It updates the Brotli library bundled in PyArrow wheels and R binaries to address CVE-2026-111497, along with C++, Python and packaging fixes. Teams that install PyArrow from wheels get the fix only by upgrading Arrow itself.

Here is the situation I expect a lot of platform teams to hit this month. Your security scanner flags CVE-2026-111497, a memory-safety bug in the Brotli decompression library. Your Linux team patches the `brotli` package on every host and container base image. The scanner goes quiet on the OS layer. Then someone asks whether the Python data pipelines are covered, and nobody can answer with confidence.

The honest answer for most PyArrow users is no. The PyArrow wheels on the Python Package Index (PyPI) carry their own copy of Brotli, compiled straight into the Arrow shared library. Patching the system package does nothing for that copy. The only way to replace it is to install a PyArrow build that ships the newer Brotli, and that build is 26.0.1.

This guide covers what changed in the release, why bundled native dependencies behave this way, who is exposed, and how to prove which build you are running. It also covers the downstream pins worth checking, with PyIceberg as the worked example, and ends with a rollout checklist you can hand to whoever owns your Python environments.

## What Arrow 26.0.1 Actually Changed

Apache Arrow is the columnar in-memory format and set of libraries that sits under a large share of the Python data stack. PyArrow is its Python binding. When pandas reads a Parquet file, when DuckDB hands results to Python, or when PyIceberg scans an Iceberg table, PyArrow is usually doing the memory layout and file decoding. If you want a refresher on the basics, my [Getting Started with PyArrow](https://iceberglakehouse.com/posts/2024-10-getting-started-with-pyarrow-in-python/) walkthrough covers tables, arrays and file I/O.

The [Arrow 26.0.1 release announcement](https://arrow.apache.org/blog/2026/11/03/26.0.1-release/) describes the version as mainly a security bugfix release. It resolves 20 issues across 24 commits from 14 contributors. It lands roughly a month after 26.0.0, whose PyPI wheels went up on October 9, 2026.

The headline item is the Brotli update. The [26.0.1 release notes](https://arrow.apache.org/release/26.0.1.html) list it as GH-55165, "Use Brotli 1.2.1 for bundled, vcpkg and R Windows builds." That title tells you exactly which build paths carried the old library. The blog post files the same issue under both the Python and R sections, because both ecosystems ship binaries built against the bundled copy.

The rest of the release is a mix of correctness and packaging fixes. The ones worth knowing about as a user are these:

- **GH-53518 (Parquet):** the C++ Parquet reader no longer treats an unknown compression codec as uncompressed. It now rejects the file.
- **GH-54936 (C++):** reading an invalid MapArray from Arrow IPC data no longer causes an out-of-bounds read.
- **GH-50544 (Gandiva):** an out-of-bounds read in `round(int, precision)` with the most negative precision is fixed.
- **GH-51684 (Parquet):** content-defined chunking keeps its state across row groups instead of resetting on each one.
- **GH-51018 (Python):** `pyarrow.compute.indices_nonzero` no longer segfaults on a ChunkedArray with zero chunks.
- **GH-51354 (C++/Parquet):** the bundled Apache Thrift library moves to 0.24.0.
- **GH-55112 (Linux packaging):** the Debian `libarrow2600` package gains its missing OpenTelemetry dependency.
- **GH-55267 (R):** the macOS CRAN build no longer fails on the macOS 11 software development kit (SDK) when building simdjson.

A few of these are memory-safety fixes in their own right, separate from Brotli. The IPC and Gandiva items both close out-of-bounds reads on malformed input. If your service reads Arrow IPC streams from sources you do not control, those two fixes are a second reason to take the patch, even if Brotli never touches your data.

The release notes also record what did not change. The blog post states there were no general changes in the other language implementations. This is a narrow patch on top of 26.0.0, not a feature release, so the upgrade risk is low and the API surface is the same.

## The Brotli Flaw in Plain Terms

Brotli is a general-purpose compression format from Google. Web servers use it for HTTP response compression, and Parquet supports it as one of its column-chunk codecs. Arrow wraps it as one of several codecs available to the C++ library and to PyArrow.

CVE-2026-111497 is a bug in the Brotli decoder, the side that decompresses data. [Red Hat's CVE page](https://access.redhat.com/security/cve/CVE-2026-111497) describes it as an out-of-bounds write in block-type switch handling in `c/dec/decode.c`. A crafted Brotli stream can cause memory disclosure or denial of service, and possibly arbitrary code execution, when an application decompresses untrusted data. The weakness class is CWE-787, out-of-bounds write.

The [Debian security tracker entry](https://security-tracker.debian.org/CVE-2026-111497) gives the version range. Google Brotli 1.0.3 through 1.2.0 is affected. The fixed releases are 1.0.10, 1.1.1 and 1.2.1. The [oss-security announcement](https://openwall.com/lists/oss-security/2026/10/26/12) from October 26, 2026 points to the upstream 1.2.1 release on the google/brotli GitHub releases page.

Severity depends on who you ask. Red Hat scores it 8.1 (Important) with a high attack complexity. Its page also cites the National Vulnerability Database (NVD) score of 9.8 (Critical), which rates attack complexity as low. I am not going to settle that disagreement here. Both scores sit in the range where most security teams require a patch on a deadline, so the practical outcome is the same.

The attack model matters more than the score. The flaw lives in decompression. An attacker needs to get a malicious Brotli stream in front of your decoder. For a web server, that means a request body or upstream response. For a data pipeline, it means a file or byte stream that your code decompresses with Brotli.

In Arrow terms, the most common path is a Parquet file whose column chunks use the `BROTLI` codec. When PyArrow reads such a file, it calls the bundled Brotli decoder on every compressed page. The explicit codec APIs, such as `pyarrow.decompress(..., codec="brotli")` and `pyarrow.CompressedInputStream`, reach the same decoder. Any process that reads Parquet files from a source it does not fully control is on the exposed side of that line.

That source can be closer than you think. A shared landing bucket where partners drop files counts. So does a data marketplace feed, a customer upload path, or an object store prefix that several teams can write to. Lakehouse designs encourage many writers and many readers against the same storage, which is the whole point of open table formats. It also means the trust boundary around a single Parquet file is wider than in a single-application database.

If that framing sounds familiar, it is because the Parquet ecosystem dealt with a similar trust problem earlier this year. My write-up on [CVE-2026-73334 and the trust boundary inside an encrypted Parquet file](https://iceberglakehouse.com/posts/parquet-kms-url-cve-2026-73334-iceberg/) covers a different bug in a different component, parquet-java's key management tools. The lesson carries over, though. A Parquet file is input, and input from outside your process deserves the same suspicion as an HTTP request.

## Why a Bundled Library Means Waiting for the Wheel

This is the part that trips up teams who are used to OS-level patching. Most Linux security fixes follow a simple path. The distribution ships a new `libbrotli` package, you run your package manager, and every program that dynamically links that library picks up the fix on its next start.

PyArrow wheels do not follow that path. A wheel is a pre-built binary package. To make one wheel install cleanly on many Linux distributions, the build follows the manylinux standard, which limits which system libraries the binary can depend on. Libraries outside that allowed set get compiled from source during the Arrow build and linked into the Arrow shared libraries. Arrow's build system calls these "bundled" dependencies.

Brotli is one of them. The GH-55165 discussion on the Arrow issue tracker states that the PyPI PyArrow wheels statically link Brotli 1.0.9. The fix commit moves the bundled version to 1.2.1. Version 1.0.9 sits inside the affected range of 1.0.3 through 1.2.0, so every PyArrow wheel built against it carries the vulnerable decoder.

You can see the static linking for yourself. I installed the 26.0.1 wheel in a clean virtual environment on Linux x86_64 and inspected `libarrow.so.2600`. Running `ldd` on it shows no dependency on any `libbrotli` shared object. The Brotli code is inside the Arrow library itself, so the dynamic loader never goes looking for the system copy.

That has three practical consequences.

First, patching the OS package does not fix PyArrow. The system `libbrotli` and the copy inside `libarrow.so` are two separate pieces of machine code. Your container scanner reports the first one. The second one is invisible to any tool that only reads the OS package database.

Second, you cannot swap the library in place. With dynamic linking you can at least point a program at a newer `.so` file. With static linking the old decoder is compiled into the same binary as everything else. The only fix is a new binary, which means a new wheel.

Third, the fix arrives on the Arrow project's schedule, not your distribution's. The oss-security announcement went out on October 26, 2026. The Arrow issue was closed on October 29, and the 26.0.1 release followed on November 3. That is a fast turnaround for a volunteer-driven Apache project, and it still left a window of about a week where no patched wheel existed.

Bundling is not a design mistake. It is the cost of making `pip install pyarrow` work on thousands of different machines with no compiler and no system packages. The trade is that the Arrow release managers become the patch channel for every library they bundle. When one of those libraries has a CVE, you need a new Arrow release, and you need to install it.

## Who Is Exposed: Wheels, R Binaries, Conda and Source Builds

Not every Arrow installation is in the same position. How you got Arrow decides where its Brotli came from, and that decides what you have to do. The GH-55165 title and the comments on the issue give a clear map.

**PyPI wheels.** This is the largest group. If you ran `pip install pyarrow`, or if `uv`, Poetry or another resolver pulled PyArrow from PyPI, you have a wheel. Every wheel before 26.0.1 that bundles Brotli 1.0.9 carries the vulnerable decoder. One commenter on the issue reported that 26.0.0 is affected, and another confirmed that production PyPI wheels are affected. The fix is to install PyArrow 26.0.1.

**R binaries.** The Arrow R package ships prebuilt binaries for some platforms. The fix title calls out "R Windows builds" by name, and the release blog lists a matching Brotli bump in the R section. If your R users install the `arrow` package from binaries on Windows, they need the build that corresponds to 26.0.1. The release notes do not spell out every R binary channel, so check with whoever maintains your R package mirror.

**vcpkg builds.** vcpkg is Microsoft's C++ package manager. Arrow's own build can pull dependencies through it, and the fix title names vcpkg as a third path that pinned the old Brotli. If you build Arrow C++ into your own application through vcpkg, update the Arrow port and rebuild.

**Conda-forge packages.** These behave differently. A commenter on GH-55165 noted that conda-forge builds link Brotli dynamically through separate `libbrotli` packages. In that setup, the Brotli fix arrives through the conda-forge Brotli package, not through PyArrow. Updating PyArrow alone does not help if the environment still resolves an old `libbrotli`. Run `conda list brotli` and confirm the installed version is one of the fixed releases.

**Linux distribution packages.** Arrow publishes Debian, Ubuntu, AlmaLinux, Amazon Linux and CentOS packages through the Apache JFrog Artifactory, per the release page. Whether those link the system Brotli or a bundled one depends on how each package was built. The release notes do not say, so treat these as "check both." Update the Arrow packages to 26.0.1 and the OS `brotli` package to a fixed version.

**Source builds.** If you compile Arrow C++ yourself, the answer depends on your dependency source settings. A build that uses the bundled Brotli picks up 1.0.9 from any pre-26.0.1 source tree. A build that uses the system Brotli inherits whatever version the build machine had installed. Rebuild from the 26.0.1 tag, `apache-arrow-26.0.1`, or confirm that the system Brotli on the build host is patched.

Exposure also depends on what your code does, not only what it has installed. The vulnerable path runs when Arrow decompresses Brotli data. A service that only writes Parquet files with Snappy or Zstandard, and never reads anything it did not write, has a much smaller attack surface than an ingestion service that reads whatever lands in a shared bucket.

I still patch both kinds of service. Codec choice is a property of the file, set by the writer. You do not get to pick it as the reader. A PyArrow process that "only reads Zstandard files" reads Brotli files too, the first time someone hands it one. The reader inspects each column chunk's codec in the file footer and calls the matching decoder. There is no reader option that refuses Brotli by default.

## Verifying What Is Actually Installed

Here is the uncomfortable fact about statically linked dependencies. PyArrow does not report the version of the Brotli it bundles. I checked the 26.0.1 wheel directly. The Brotli version function is not exported from `libarrow.so.2600`, and `pyarrow.show_info()` lists Brotli only as "Enabled" under compression codecs, with no version number.

So the Arrow version is your proxy. If the process is running PyArrow 26.0.1 from a PyPI wheel, it has Brotli 1.2.1. If it is running anything older from a PyPI wheel, assume Brotli 1.0.9. That makes the verification job simple to describe and easy to get wrong in practice, because "installed" and "loaded" are not always the same thing.

Start with the package manager's view, then confirm with the interpreter's view:

```bash
# 1. What does pip think is installed in this environment?
pip show pyarrow

# 2. What does the running interpreter actually import?
python -c "import pyarrow; print(pyarrow.__version__)"

# 3. Which build of the C++ library is loaded, and where did it come from?
python -c "import pyarrow as pa; print(pa.cpp_build_info.version, pa.cpp_build_info.package_kind)"

# 4. Full build report, including the codec table
python -c "import pyarrow as pa; pa.show_info()"

# 5. For conda environments, check the separate Brotli package too
conda list brotli
```

Each command answers a different question.

`pip show pyarrow` reads the package metadata in the active environment. On my test install it reports `Version: 26.0.1`. This is the quickest check, but it only tells you about the environment that `pip` belongs to. On a machine with several Python installations, the `pip` on your path and the `python` your job runs are not guaranteed to match.

`pyarrow.__version__` comes from the module the interpreter actually imported. Run it with the same interpreter, virtual environment and working directory your job uses. On my install it prints `26.0.1`. If this disagrees with `pip show`, you have two environments in play, and the job is using the one you did not patch.

`pa.cpp_build_info` describes the Arrow C++ library that PyArrow loaded. On the 26.0.1 Linux wheel, the version field is `26.0.1` and `package_kind` is `python-wheel-manylinux228`. The package kind is the useful part. A value that starts with `python-wheel` tells you the bundled Brotli story applies. A conda-forge or distribution build reports a different kind, and that points you to the separate Brotli package instead.

`pa.show_info()` prints the full build report. The header shows the package kind and the Arrow C++ library version. Further down, the "Compression Codecs" table shows whether Brotli support is compiled in. On the 26.0.1 wheel, `brotli` shows as `Enabled`. If a custom build shows it disabled, that build never had the vulnerable decoder in the first place.

`conda list brotli` matters only for conda environments. There, the Brotli version is the one that counts, and it should be 1.0.10, 1.1.1, 1.2.1 or later per the Debian tracker's fixed-version list.

For a fleet, wrap the interpreter check in whatever runs on every host or container. A one-line assertion in a smoke test catches regressions too:

```python
import pyarrow as pa

ver = pa.cpp_build_info.version_info
assert (ver.major, ver.minor, ver.patch) >= (26, 0, 1), (
    f"PyArrow {pa.__version__} predates the Brotli fix in 26.0.1"
)
print("pyarrow", pa.__version__, pa.cpp_build_info.package_kind)
```

`cpp_build_info.version_info` is a named tuple with `major`, `minor` and `patch` fields, so the comparison is a plain tuple comparison. Putting this in a container's build step or a pipeline's startup check turns "did we patch?" into a test that fails loudly.

Two more places hide old copies. Lockfiles such as `poetry.lock`, `uv.lock` and pinned `requirements.txt` files freeze the version. Search them for `pyarrow` and update the pin. Container images bake the wheel into a layer at build time, so a running image does not change until you rebuild it. Your registry likely holds older images still in use by scheduled jobs.

## Downstream Pins: PyIceberg and Tools That Embed PyArrow

Most teams do not install PyArrow on purpose. It arrives as a dependency of something else. That is where upgrades stall, because the version you get is whatever the resolver picks inside the constraints of every package in the environment.

PyIceberg is a good example to walk through, since it is the Python implementation of Apache Iceberg and leans on PyArrow for reading and writing data files. I pulled the current `pyproject.toml` from the apache/iceberg-python repository, which declares version 0.12.0. PyIceberg's core dependencies do not include PyArrow at all. It shows up only in optional extras:

```toml
[project.optional-dependencies]
pyarrow = [
    "pyarrow>=18.0.0",
]
pandas = [
    "pandas>=1.0.0",
    "pyarrow>=18.0.0",
]
duckdb = [
    "duckdb>=0.5.0",
    "pyarrow>=18.0.0",
]
ray = [
    "ray>=2.10.0",
    "pyarrow>=18.0.0",
    "pandas>=1.0.0",
]
```

This is the published constraint set for PyIceberg 0.12.0 on PyPI as well. The package metadata lists `pyarrow>=18.0.0` for the `pyarrow`, `pandas`, `duckdb` and `ray` extras.

Two things stand out. The floor is 18.0.0, which is far below 26.0.1. And there is no upper bound. PyIceberg does not block you from installing 26.0.1, but it does not require it either. If you run `pip install "pyiceberg[pyarrow]"` into an environment that already has PyArrow 21, pip sees the constraint as satisfied and leaves the old version alone.

So the PyIceberg pin is permissive, and that cuts both ways. You can take the patched release today with no change on the PyIceberg side. You also have to ask for it explicitly. The simplest fix is to add your own floor in the application's requirements or `pyproject.toml`:

```toml
[project]
dependencies = [
    "pyiceberg[pyarrow]>=0.12.0",
    "pyarrow>=26.0.1",
]
```

That second line makes the resolver choose the patched build, and it fails the install outright if something else in the environment caps PyArrow below 26.0.1. A failed install is the outcome you want. It surfaces the conflict at build time instead of letting an old wheel slip through.

The same check applies to every other tool in the environment that pulls in PyArrow. Data frame libraries, query engines with Python bindings, and distributed compute frameworks all tend to declare a PyArrow range. Some set an upper bound to protect themselves from breaking changes in new major versions. A cap like `pyarrow<26` in any one of them blocks the fix for the whole environment.

Use the resolver to find out. `pip install "pyarrow>=26.0.1"` in a copy of the environment either succeeds or prints the package whose constraint conflicts. `pip show pyarrow` lists the installed packages that depend on it under "Required-by," which tells you who else to check.

There is one more constraint to watch. The PyPI metadata for PyArrow 26.0.1 declares `requires_python >=3.11`. An environment still on Python 3.10 cannot install it. The resolver quietly falls back to the newest PyArrow that supports 3.10, which is a build with the old Brotli. If your scanner shows a patched requirement but an unpatched install, check the Python version first.

Engines that embed PyArrow in a larger runtime need their own check. A distributed framework that ships workers as container images, or a notebook platform with a managed base environment, controls the PyArrow version on behalf of your code. Upgrading the driver side of a job does nothing for workers built from an older image. Confirm the version on the workers by running the interpreter check from inside a task, not from the client.

## What Else Changes Behavior in 26.0.1

A patch release is supposed to be boring. This one mostly is. Two fixes change observable behavior, though, and they belong on your test plan before the rollout reaches production.

**Unknown Parquet codecs now fail.** Before GH-53518, the C++ Parquet reader treated a column chunk with an unrecognized compression codec as if it were uncompressed. That produced garbage values or confusing downstream errors instead of a clear failure. In 26.0.1, the reader rejects the file. This is the right behavior. It also means a pipeline that "worked" on a malformed file now raises an error. If you see new Parquet read failures right after the upgrade, check the codec in the file footer before blaming the patch.

You can inspect the codec of any column chunk from Python. `pq.ParquetFile(path).metadata.row_group(0).column(0).compression` returns the codec name as a string. On a file written with `compression="brotli"`, it returns `BROTLI`. This is also a quick way to find out whether Brotli-compressed files exist in your storage at all, which helps you rank which readers to patch first.

**Content-defined chunking keeps state across row groups.** Content-defined chunking is a Parquet writer feature that picks page boundaries based on the data itself, so that small edits to a file produce mostly identical pages. Before GH-51684, the chunker reset its state at the start of every row group. After the fix, it carries state across them. If you use this feature for deduplicated storage, files written by 26.0.1 can split pages differently from files written by 26.0.0. The data is the same. Only the page layout differs, so expect some churn in byte-level comparisons the first time you rewrite files with the new version.

The bundled Apache Thrift update to 0.24.0 under GH-51354 is internal. Thrift is the serialization library Parquet uses for its file metadata. You do not call it directly, and the release notes list it as an improvement, not a behavior change.

## Rollout Checklist

Here is the order I use for a dependency-level security patch like this one. It assumes a mix of virtual environments, containers and at least one shared platform such as a notebook service or a scheduler.

| Install path                     | Where Brotli comes from               | What to update                                            |
| -------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| PyPI wheel (`pip`, `uv`, Poetry) | Static copy inside `libarrow.so`      | PyArrow to 26.0.1                                         |
| conda-forge                      | Separate `libbrotli` package          | Brotli package to a fixed release                         |
| R binaries on Windows            | Bundled copy                          | `arrow` R package build for 26.0.1                        |
| vcpkg C++ build                  | vcpkg Brotli port                     | Arrow port and rebuild                                    |
| Source build                     | Bundled or system, per build settings | Rebuild from `apache-arrow-26.0.1` or patch system Brotli |

1. **Inventory.** List every environment that imports PyArrow. Include notebooks, scheduled jobs, API services and worker images. Search lockfiles and requirements files for `pyarrow`.
2. **Classify the install path.** Run `pa.cpp_build_info.package_kind` in each environment. Wheels go to step 3. Conda environments go to step 4.
3. **Raise the floor for wheels.** Add `pyarrow>=26.0.1` to the application's own dependencies. Resolve, and fix any package that caps PyArrow below 26.0.1. Confirm the Python version is 3.11 or newer.
4. **Patch conda Brotli.** Update the `brotli` and `libbrotli` packages and confirm the version with `conda list brotli`.
5. **Rebuild images.** Rebuild every container image that bakes in PyArrow. Redeploy workers as well as drivers.
6. **Test the behavior changes.** Run your Parquet read tests against real production files, and watch for new codec errors from GH-53518.
7. **Verify in place.** Run the interpreter check from inside each running service or task. Add the version assertion to startup or smoke tests.
8. **Retire old images.** Remove or block pre-26.0.1 images in your registry so a rollback does not reintroduce the old decoder.

Prioritize by exposure. Services that read Parquet or Brotli streams from outside your trust boundary go first. Internal batch jobs that read only their own output go last, but they still go.

## Conclusion

Arrow 26.0.1 is a small release with a big operational lesson. The Brotli fix itself is a one-line version bump in Arrow's build. Getting it onto your machines takes a full dependency rollout, because the vulnerable code lives inside a statically linked binary that no OS patch can reach.

The verification story is just as specific. PyArrow does not report its bundled Brotli version, so the Arrow version and the package kind are what you check. Confirm both from the interpreter your job actually runs, not from the package manager on your path. Then raise your own floor to `pyarrow>=26.0.1`, since permissive pins like PyIceberg's `>=18.0.0` do not pull the fix in for you.

If you also run Arrow Database Connectivity drivers, the [ADBC 25 upgrade guide](https://datalakehousehub.com/blog/adbc-25-upgrade-guide/) covers the driver API changes in that release. Schedule it alongside this one so your Arrow stack moves together.

## Keep Going

If this piece was useful, I have written a lot more on Apache Iceberg and the open lakehouse stack that PyArrow sits under. _Architecting an Apache Iceberg Lakehouse_ covers how the storage, table format, catalog and engine layers fit together. You can find every book I have written, across lakehouse architecture, Apache Iceberg, Apache Polaris, and AI, at [books.alexmerced.com](https://books.alexmerced.com).

## Sources

- [Apache Arrow 26.0.1 release blog post](https://arrow.apache.org/blog/2026/11/03/26.0.1-release/)
- [Apache Arrow 26.0.1 release notes](https://arrow.apache.org/release/26.0.1.html)
- [GH-55165: We should take a newer version of Brotli (apache/arrow)](https://github.com/apache/arrow/issues/55165)
- [Red Hat: CVE-2026-111497](https://access.redhat.com/security/cve/CVE-2026-111497)
- [Debian security tracker: CVE-2026-111497](https://security-tracker.debian.org/CVE-2026-111497)
- [oss-security announcement, October 26, 2026](https://openwall.com/lists/oss-security/2026/10/26/12)
- [PyIceberg pyproject.toml (apache/iceberg-python)](https://github.com/apache/iceberg-python/blob/main/pyproject.toml)
- [PyArrow on PyPI](https://pypi.org/project/pyarrow/)
